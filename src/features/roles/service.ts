import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import { PERMISSIONS, can } from "@/lib/rbac";
import { slugify } from "@/lib/slug";
import type { CurrentUser } from "@/lib/types";
import type { SaveRoleCommand } from "./schema";

/**
 * Service layer fitur roles: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dibutuhkan dependency (client
 * Supabase) lewat parameter sehingga bisa di-mock saat testing.
 */
export type RoleMutationsDeps = {
  /** Client RLS (membawa identitas user yang sedang login). */
  supabase: SupabaseClient<Database>;
};

type PermissionRow = { slug?: string } | null;

/**
 * Cari slug permission yang dicoba diberikan tetapi tidak dimiliki actor.
 * Murni (tanpa I/O) agar mudah dites; mencegah privilege escalation.
 */
export function findEscalatingSlugs(
  slugs: Array<string | null | undefined>,
  allowed: Set<string>
): string[] {
  return slugs.filter(
    (slug): slug is string => Boolean(slug) && !allowed.has(slug as string)
  );
}

/**
 * Pastikan actor tidak memberikan permission yang melebihi miliknya.
 * Kembalikan pesan error, atau null bila aman. Penegakan utama tetap di RLS.
 */
async function assertPermissionsAssignable(
  deps: Pick<RoleMutationsDeps, "supabase">,
  current: CurrentUser,
  permissionIds: string[]
): Promise<string | null> {
  if (current.isSuperAdmin || permissionIds.length === 0) return null;
  if (!can(current.permissions, PERMISSIONS.rolesUpdate, false)) return null;

  const { data, error } = await deps.supabase
    .from("permissions")
    .select("slug")
    .in("id", permissionIds);

  if (error) return "Gagal memvalidasi hak akses.";

  const allowed = new Set(current.permissions);
  const escalating = findEscalatingSlugs(
    (data ?? []).map((row: PermissionRow) => row?.slug),
    allowed
  );

  return escalating.length > 0
    ? "Anda tidak bisa memberikan hak akses yang tidak Anda miliki."
    : null;
}

/** Sinkronisasi role_permissions untuk sebuah role. */
async function syncRolePermissions(
  supabase: SupabaseClient<Database>,
  roleId: string,
  permissionIds: string[]
): Promise<MutationResult | null> {
  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) {
    return errResult(
      serverError(deleteError, "Role tersimpan, tapi hak akses gagal diperbarui.")
    );
  }

  if (permissionIds.length > 0) {
    const { error: insertError } = await supabase.from("role_permissions").insert(
      permissionIds.map((permission_id) => ({ role_id: roleId, permission_id }))
    );

    if (insertError) {
      return errResult(serverError(insertError, "Hak akses gagal disimpan."));
    }
  }

  return null;
}

/**
 * Buat slug unik untuk role baru, menghindari kolisi dengan slug yang sudah ada.
 */
async function generateUniqueSlug(
  supabase: SupabaseClient<Database>,
  baseSlug: string
): Promise<string> {
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

  return slug;
}

/** Ubah data role yang sudah ada (nama, deskripsi, permission). */
async function updateRoleRecord(
  deps: RoleMutationsDeps,
  current: CurrentUser,
  command: SaveRoleCommand
): Promise<MutationResult> {
  const { supabase } = deps;
  const roleId = command.id as string;

  const { data: target } = await supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .maybeSingle();

  if (!target) {
    return errResult("Role tidak ditemukan atau bukan bagian dari sekolah Anda.");
  }

  const { error: updateError } = await supabase
    .from("roles")
    .update({
      name: command.name,
      description: command.description || null,
    })
    .eq("id", roleId);

  if (updateError) {
    return errResult(serverError(updateError, "Gagal memperbarui role."));
  }

  if (can(current.permissions, PERMISSIONS.rolesUpdate, current.isSuperAdmin)) {
    const failed = await syncRolePermissions(
      supabase,
      roleId,
      command.permission_ids
    );
    if (failed) return failed;
  }

  return okResult("Role berhasil diperbarui.");
}

/** Buat role baru beserta permission-nya. */
async function createRoleRecord(
  deps: RoleMutationsDeps,
  current: CurrentUser,
  command: SaveRoleCommand
): Promise<MutationResult> {
  const { supabase } = deps;

  const baseSlug = slugify(command.name, "_", "role");
  const slug = await generateUniqueSlug(supabase, baseSlug);

  const { data: created, error: insertError } = await supabase
    .from("roles")
    .insert({
      school_id: current.profile.school_id,
      name: command.name,
      slug,
      description: command.description || null,
      is_system: false,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return errResult(serverError(insertError, "Gagal membuat role."));
  }

  const roleId = created.id;

  if (command.permission_ids.length > 0) {
    const failed = await syncRolePermissions(
      supabase,
      roleId,
      command.permission_ids
    );
    if (failed) return failed;
  }

  return okResult("Role baru berhasil dibuat.");
}

/**
 * Hapus role beserta semua permission yang terkait.
 * Mencegah penghapusan role sistem dan role yang masih dipakai user.
 */
export async function deleteRoleRecord(
  deps: Pick<RoleMutationsDeps, "supabase">,
  current: CurrentUser,
  roleId: string
): Promise<MutationResult> {
  if (!can(current.permissions, PERMISSIONS.rolesDelete, current.isSuperAdmin)) {
    return errResult("Anda tidak punya izin menghapus role.");
  }

  const { supabase } = deps;

  const { data: target } = await supabase
    .from("roles")
    .select("id, name, is_system")
    .eq("id", roleId)
    .maybeSingle();

  if (!target) return errResult("Role tidak ditemukan.");
  if (target.is_system) return errResult("Role bawaan tidak bisa dihapus.");

  const { count } = await supabase
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if ((count ?? 0) > 0) {
    return errResult(
      `Role masih dipakai oleh ${count} user. Pindahkan mereka ke role lain dulu.`
    );
  }

  const { error } = await supabase.from("roles").delete().eq("id", roleId);
  if (error) return errResult(serverError(error, "Gagal menghapus role."));

  return okResult(`Role ${target.name} berhasil dihapus.`);
}

/** Titik masuk utama: simpan role (buat bila tanpa `id`, ubah bila dengan `id`). */
export async function saveRoleRecord(
  deps: RoleMutationsDeps,
  current: CurrentUser,
  command: SaveRoleCommand
): Promise<MutationResult> {
  // Cegah privilege escalation sebelum operasi tulis apa pun.
  const escalationError = await assertPermissionsAssignable(
    deps,
    current,
    command.permission_ids
  );
  if (escalationError) return errResult(escalationError);

  return command.id
    ? updateRoleRecord(deps, current, command)
    : createRoleRecord(deps, current, command);
}
