"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accessBlocked, getCurrentUser } from "@/lib/auth";
import { serverError } from "@/lib/errors";
import { PERMISSIONS, can } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

const saveSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Nama role minimal 2 karakter"),
  description: z.string().trim().optional(),
});

function revalidateRolePages() {
  revalidatePath("/roles");
  revalidatePath("/users");
  revalidatePath("/dashboard");
}

export async function saveRole(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir. Silakan login ulang." };

  const blocked = accessBlocked(current);
  if (blocked) return { error: blocked };

  const parsed = saveSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const isEdit = Boolean(parsed.data.id);
  const requiredPermission = isEdit
    ? PERMISSIONS.rolesUpdate
    : PERMISSIONS.rolesCreate;

  if (!can(current.permissions, requiredPermission, current.isSuperAdmin)) {
    return {
      error: isEdit
        ? "Anda tidak punya izin mengubah role."
        : "Anda tidak punya izin menambah role.",
    };
  }

  const supabase = await createClient();
  const permissionIds = formData
    .getAll("permission_ids")
    .map((value) => String(value))
    .filter(Boolean);

  // Cegah privilege escalation: admin non-super tidak boleh memberikan
  // permission yang tidak ia miliki. Penegakan utama tetap di RLS.
  if (!current.isSuperAdmin && permissionIds.length > 0) {
    const { data: requestedPermissions, error: permissionCheckError } =
      await supabase.from("permissions").select("slug").in("id", permissionIds);

    if (permissionCheckError) {
      return { error: "Gagal memvalidasi hak akses." };
    }

    const allowed = new Set(current.permissions);
    const escalating = (requestedPermissions ?? []).some(
      (permission) => !allowed.has(permission.slug)
    );

    if (escalating) {
      return {
        error: "Anda tidak bisa memberikan hak akses yang tidak Anda miliki.",
      };
    }
  }

  let roleId: string;

  if (isEdit) {
    roleId = parsed.data.id as string;

    const { data: target } = await supabase
      .from("roles")
      .select("id")
      .eq("id", roleId)
      .maybeSingle();

    if (!target) {
      return {
        error: "Role tidak ditemukan atau bukan bagian dari sekolah Anda.",
      };
    }

    const { error: updateError } = await supabase
      .from("roles")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .eq("id", roleId);

    if (updateError) {
      return { error: serverError(updateError, "Gagal memperbarui role.") };
    }
  } else {
    const baseSlug = slugify(parsed.data.name, "_", "role");

    const { data: existing } = await supabase
      .from("roles")
      .select("slug")
      .like("slug", `${baseSlug}%`);

    const taken = new Set((existing ?? []).map((row) => row.slug));
    let slug = baseSlug;
    let counter = 2;
    while (taken.has(slug)) {
      slug = `${baseSlug}_${counter}`;
      counter += 1;
    }

    const { data: created, error: insertError } = await supabase
      .from("roles")
      .insert({
        school_id: current.profile.school_id,
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        is_system: false,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: serverError(insertError, "Gagal membuat role.") };
    }

    roleId = created.id;
  }

  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) {
    return {
      error: serverError(
        deleteError,
        "Role tersimpan, tapi hak akses gagal diperbarui."
      ),
    };
  }

  if (permissionIds.length > 0) {
    const { error: insertPermissionError } = await supabase
      .from("role_permissions")
      .insert(
        permissionIds.map((permission_id) => ({
          role_id: roleId,
          permission_id,
        }))
      );

    if (insertPermissionError) {
      return {
        error: serverError(insertPermissionError, "Hak akses gagal disimpan."),
      };
    }
  }

  revalidateRolePages();
  return {
    success: isEdit ? "Role berhasil diperbarui." : "Role baru berhasil dibuat.",
  };
}

export async function deleteRole(roleId: string): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir." };

  const blocked = accessBlocked(current);
  if (blocked) return { error: blocked };

  if (!can(current.permissions, PERMISSIONS.rolesDelete, current.isSuperAdmin)) {
    return { error: "Anda tidak punya izin menghapus role." };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (!target) return { error: "Role tidak ditemukan." };

  if (target.is_system) {
    return { error: "Role bawaan tidak bisa dihapus." };
  }

  const { count } = await supabase
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if ((count ?? 0) > 0) {
    return {
      error: `Role masih dipakai oleh ${count} user. Pindahkan mereka ke role lain dulu.`,
    };
  }

  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) return { error: serverError(error, "Gagal menghapus role.") };

  revalidateRolePages();
  return { success: `Role ${target.name} berhasil dihapus.` };
}
