"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accessBlocked, getCurrentUser } from "@/lib/auth";
import { serverError } from "@/lib/errors";
import { validatePassword } from "@/lib/password";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

const saveSchema = z.object({
  id: z.uuid().optional(),
  full_name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.email("Format email tidak valid").optional(),
  password: z.string().optional(),
  phone: z.string().trim().optional(),
  jabatan: z.string().trim().optional(),
});

function revalidateUserPages() {
  revalidatePath("/users");
  revalidatePath("/dashboard");
}

function readRoleIds(formData: FormData): string[] {
  return formData
    .getAll("role_ids")
    .map((value) => String(value))
    .filter(Boolean);
}

export async function saveUser(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir. Silakan login ulang." };

  const blocked = accessBlocked(current);
  if (blocked) return { error: blocked };

  const parsed = saveSchema.safeParse({
    id: formData.get("id") || undefined,
    full_name: formData.get("full_name"),
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
    phone: formData.get("phone") ?? "",
    jabatan: formData.get("jabatan") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const isEdit = Boolean(parsed.data.id);
  const requiredPermission = isEdit
    ? PERMISSIONS.usersUpdate
    : PERMISSIONS.usersCreate;

  if (!can(current.permissions, requiredPermission, current.isSuperAdmin)) {
    return {
      error: isEdit
        ? "Anda tidak punya izin mengubah user."
        : "Anda tidak punya izin menambah user.",
    };
  }

  if (!parsed.data.full_name) {
    return { error: "Nama wajib diisi." };
  }

  if (parsed.data.password) {
    const passwordError = validatePassword(parsed.data.password);
    if (passwordError) return { error: passwordError };
  }

  const supabase = await createClient();
  const canAssignRole = can(
    current.permissions,
    PERMISSIONS.usersAssignRole,
    current.isSuperAdmin
  );
  const isActive = formData.get("is_active") === "true";
  const roleIds = readRoleIds(formData);

  // Cegah privilege escalation: admin non-super tidak boleh memberikan role
  // yang permission-nya melebihi miliknya. Penegakan utama tetap di RLS.
  if (!current.isSuperAdmin && canAssignRole && roleIds.length > 0) {
    const { data: rolePermissions, error: rolePermissionCheckError } =
      await supabase
        .from("role_permissions")
        .select("permissions!inner(slug)")
        .in("role_id", roleIds);

    if (rolePermissionCheckError) {
      return { error: "Gagal memvalidasi role." };
    }

    const allowed = new Set(current.permissions);
    const escalating = (rolePermissions ?? []).some((row) => {
      const slug = (row.permissions as { slug?: string } | null)?.slug;
      return slug && !allowed.has(slug);
    });

    if (escalating) {
      return {
        error:
          "Anda tidak bisa memberikan role dengan hak akses melebihi milik Anda.",
      };
    }
  }

  // Super admin boleh memilih sekolah tujuan. Admin sekolah biasa selalu
  // terikat ke sekolahnya sendiri.
  const requestedSchoolId = String(formData.get("school_id") ?? "").trim();
  const schoolProvided = formData.get("school_included") === "true";

  if (isEdit) {
    const id = parsed.data.id as string;

    if (id === current.id && !isActive) {
      return { error: "Anda tidak bisa menonaktifkan akun sendiri." };
    }

    const { data: target } = await supabase
      .from("profiles")
      .select("id, school_id")
      .eq("id", id)
      .maybeSingle();

    if (!target) {
      return {
        error: "User tidak ditemukan atau bukan bagian dari sekolah Anda.",
      };
    }

    const movingSchool =
      current.isSuperAdmin &&
      schoolProvided &&
      (requestedSchoolId || null) !== target.school_id;

    const updatePayload: Record<string, unknown> = {
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      jabatan: parsed.data.jabatan || null,
      is_active: isActive,
    };

    if (current.isSuperAdmin && schoolProvided) {
      updatePayload.school_id = requestedSchoolId || null;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return { error: serverError(updateError, "Gagal memperbarui user.") };
    }

    // Role terikat pada satu sekolah, jadi pindah sekolah berarti role lama
    // tidak lagi berlaku. Dibersihkan agar tidak menyisakan akses yang salah.
    if (movingSchool) {
      const { error: clearError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id);

      if (clearError) {
        return {
          error: serverError(
            clearError,
            "Sekolah dipindahkan, tetapi role lama gagal dibersihkan."
          ),
        };
      }
    }

    if (parsed.data.password) {
      try {
        const admin = createAdminClient();
        const { error: passwordError } = await admin.auth.admin.updateUserById(
          id,
          { password: parsed.data.password }
        );
        if (passwordError) {
          return {
            error: serverError(
              passwordError,
              "Profil disimpan, tapi password gagal diubah."
            ),
          };
        }
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : "Gagal mengubah password.",
        };
      }
    }

    if (canAssignRole && formData.get("roles_included") === "true") {
      if (!current.isSuperAdmin && id === current.id) {
        return { error: "Anda tidak bisa mengubah role akun sendiri." };
      }

      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", id);

      if (deleteError) {
        return {
          error: serverError(deleteError, "Profil disimpan, tapi role gagal diubah."),
        };
      }

      if (roleIds.length > 0) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert(roleIds.map((role_id) => ({ user_id: id, role_id })));

        if (roleError) {
          return {
            error: serverError(roleError, "Profil disimpan, tapi role gagal."),
          };
        }
      }
    }

    revalidateUserPages();
    return { success: "Perubahan berhasil disimpan." };
  }

  if (!parsed.data.email || !parsed.data.password) {
    return { error: "Email dan password wajib diisi untuk user baru." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Service role key belum dikonfigurasi.",
    };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email.toLowerCase(),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (createError || !created?.user) {
    if (/already|registered|exists/i.test(createError?.message ?? "")) {
      return { error: "Email sudah terdaftar." };
    }
    return { error: serverError(createError, "Gagal membuat akun.") };
  }

  const newUserId = created.user.id;

  const targetSchoolId =
    current.isSuperAdmin && schoolProvided
      ? requestedSchoolId || null
      : current.profile.school_id;

  // Baris profil user baru dibuat via service role dan masih ber-school_id NULL,
  // sehingga belum terlihat oleh policy SELECT admin user. Untuk perintah UPDATE,
  // PostgreSQL meng-AND-kan policy SELECT, jadi memakai client RLS (supabase) di
  // sini akan mencocokkan 0 baris tanpa error. Penugasan sekolah harus lewat
  // service role (admin). targetSchoolId utk non-super di-hardcode dari
  // current.profile.school_id, bukan dari input form, jadi aman.
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .update({
      school_id: targetSchoolId,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      jabatan: parsed.data.jabatan || null,
      is_active: isActive,
    })
    .eq("id", newUserId)
    .select("id");

  // .select() membuat kegagalan "0 baris terubah" jadi terlihat. Kalau profil
  // tidak tergenerate, bersihkan akun auth yang baru dibuat agar tidak
  // meninggalkan akun "yatim" (school_id NULL, tanpa role).
  if (profileError || !profileRows?.length) {
    await admin.auth.admin.deleteUser(newUserId);
    return {
      error: serverError(
        profileError ?? new Error("Profil user baru tidak ditemukan setelah dibuat."),
        "Gagal menyimpan profil user."
      ),
    };
  }

  if (canAssignRole && roleIds.length > 0) {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert(roleIds.map((role_id) => ({ user_id: newUserId, role_id })));

    if (roleError) {
      return {
        error: serverError(roleError, "User dibuat, tetapi role gagal diberikan."),
      };
    }
  }

  revalidateUserPages();
  return { success: `User ${parsed.data.full_name} berhasil dibuat.` };
}

export async function setUserActive(
  userId: string,
  isActive: boolean
): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir." };

  const blocked = accessBlocked(current);
  if (blocked) return { error: blocked };

  if (!can(current.permissions, PERMISSIONS.usersUpdate, current.isSuperAdmin)) {
    return { error: "Anda tidak punya izin mengubah user." };
  }
  if (userId === current.id && !isActive) {
    return { error: "Anda tidak bisa menonaktifkan akun sendiri." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { error: "User tidak ditemukan." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { error: serverError(error, "Gagal mengubah status user.") };

  revalidateUserPages();
  return {
    success: isActive ? "User diaktifkan." : "User dinonaktifkan.",
  };
}

export async function deleteUser(userId: string): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) return { error: "Sesi Anda berakhir." };

  const blocked = accessBlocked(current);
  if (blocked) return { error: blocked };

  if (!can(current.permissions, PERMISSIONS.usersDelete, current.isSuperAdmin)) {
    return { error: "Anda tidak punya izin menghapus user." };
  }
  if (userId === current.id) {
    return { error: "Anda tidak bisa menghapus akun sendiri." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return { error: "User tidak ditemukan." };

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Service role key belum diisi.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: serverError(error, "Gagal menghapus user.") };

  revalidateUserPages();
  return { success: "User berhasil dihapus." };
}
