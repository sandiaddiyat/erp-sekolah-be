import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import { PERMISSIONS, can } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/types";
import type { SaveUserCommand } from "./schema";

/**
 * Service layer fitur users: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dibutuhkan dependency (client
 * Supabase) lewat parameter sehingga bisa di-mock saat testing dan bisa
 * dipanggil dari Server Action maupun API backend di masa depan.
 */
export type UserMutationsDeps = {
  /** Client RLS (membawa identitas user yang sedang login). */
  supabase: SupabaseClient<Database>;
  /** Factory service-role client; melempar bila env belum diisi. */
  createAdmin: () => SupabaseClient<Database>;
};

type RolePermissionRow = {
  permissions: { slug?: string } | null;
};

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
 * Pastikan actor tidak memberikan role yang permission-nya melebihi miliknya.
 * Kembalikan pesan error, atau null bila aman. Penegakan utama tetap di RLS.
 */
async function assertRolesAssignable(
  deps: Pick<UserMutationsDeps, "supabase">,
  current: CurrentUser,
  roleIds: string[]
): Promise<string | null> {
  if (current.isSuperAdmin || roleIds.length === 0) return null;
  if (!can(current.permissions, PERMISSIONS.usersAssignRole, false)) return null;

  const { data, error } = await deps.supabase
    .from("role_permissions")
    .select("permissions!inner(slug)")
    .in("role_id", roleIds);

  if (error) return "Gagal memvalidasi role.";

  const allowed = new Set(current.permissions);
  const escalating = findEscalatingSlugs(
    (data ?? []).map(
      (row) => (row as RolePermissionRow).permissions?.slug
    ),
    allowed
  );

  return escalating.length > 0
    ? "Anda tidak bisa memberikan role dengan hak akses melebihi milik Anda."
    : null;
}

function canAssignRoles(current: CurrentUser): boolean {
  return can(current.permissions, PERMISSIONS.usersAssignRole, current.isSuperAdmin);
}

async function insertUserRoles(
  supabase: SupabaseClient<Database>,
  userId: string,
  roleIds: string[],
  fallbackError: string
): Promise<MutationResult | null> {
  const { error } = await supabase
    .from("user_roles")
    .insert(roleIds.map((role_id) => ({ user_id: userId, role_id })));

  if (error) return errResult(serverError(error, fallbackError));
  return null;
}

/** Ubah data user yang sudah ada (profile, sekolah, password, role). */
async function updateUserRecord(
  deps: UserMutationsDeps,
  current: CurrentUser,
  command: SaveUserCommand
): Promise<MutationResult> {
  const { supabase } = deps;
  const id = command.id as string;

  if (id === current.id && !command.is_active) {
    return errResult("Anda tidak bisa menonaktifkan akun sendiri.");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, school_id")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return errResult(
      "User tidak ditemukan atau bukan bagian dari sekolah Anda."
    );
  }

  const movingSchool =
    current.isSuperAdmin &&
    command.school_included &&
    (command.school_id || null) !== target.school_id;

  const updatePayload: Database["public"]["Tables"]["profiles"]["Update"] = {
    full_name: command.full_name,
    phone: command.phone || null,
    jabatan: command.jabatan || null,
    is_active: command.is_active,
  };

  if (current.isSuperAdmin && command.school_included) {
    updatePayload.school_id = command.school_id || null;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return errResult(serverError(updateError, "Gagal memperbarui user."));
  }

  // Role terikat pada satu sekolah, jadi pindah sekolah berarti role lama
  // tidak lagi berlaku. Dibersihkan agar tidak menyisakan akses yang salah.
  if (movingSchool) {
    const { error: clearError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", id);

    if (clearError) {
      return errResult(
        serverError(
          clearError,
          "Sekolah dipindahkan, tetapi role lama gagal dibersihkan."
        )
      );
    }
  }

  if (command.password) {
    let admin: SupabaseClient<Database>;
    try {
      admin = deps.createAdmin();
    } catch (error) {
      return errResult(
        error instanceof Error ? error.message : "Gagal mengubah password."
      );
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(id, {
      password: command.password,
    });

    if (passwordError) {
      return errResult(
        serverError(
          passwordError,
          "Profil disimpan, tapi password gagal diubah."
        )
      );
    }
  }

  if (command.roles_included && canAssignRoles(current)) {
    if (!current.isSuperAdmin && id === current.id) {
      return errResult("Anda tidak bisa mengubah role akun sendiri.");
    }

    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", id);

    if (deleteError) {
      return errResult(
        serverError(deleteError, "Profil disimpan, tapi role gagal diubah.")
      );
    }

    if (command.role_ids.length > 0) {
      const failed = await insertUserRoles(
        supabase,
        id,
        command.role_ids,
        "Profil disimpan, tapi role gagal."
      );
      if (failed) return failed;
    }
  }

  return okResult("Perubahan berhasil disimpan.");
}

/** Buat akun auth + profile + role untuk user baru. */
async function createUserRecord(
  deps: UserMutationsDeps,
  current: CurrentUser,
  command: SaveUserCommand
): Promise<MutationResult> {
  let admin: SupabaseClient<Database>;
  try {
    admin = deps.createAdmin();
  } catch (error) {
    return errResult(
      error instanceof Error
        ? error.message
        : "Service role key belum dikonfigurasi."
    );
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: (command.email as string).toLowerCase(),
      password: command.password as string,
      email_confirm: true,
      user_metadata: { full_name: command.full_name },
    });

  if (createError || !created?.user) {
    if (/already|registered|exists/i.test(createError?.message ?? "")) {
      return errResult("Email sudah terdaftar.");
    }
    return errResult(serverError(createError, "Gagal membuat akun."));
  }

  const newUserId = created.user.id;

  // Super admin boleh memilih sekolah tujuan. Admin sekolah biasa selalu
  // terikat ke sekolahnya sendiri (bukan dari input form, jadi aman).
  const targetSchoolId =
    current.isSuperAdmin && command.school_included
      ? command.school_id || null
      : current.profile.school_id;

  // Baris profil user baru dibuat via service role dan masih ber-school_id NULL,
  // sehingga belum terlihat oleh policy SELECT admin user. Untuk perintah UPDATE,
  // PostgreSQL meng-AND-kan policy SELECT, jadi memakai client RLS (supabase) di
  // sini akan mencocokkan 0 baris tanpa error. Penugasan sekolah harus lewat
  // service role (admin).
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .update({
      school_id: targetSchoolId,
      full_name: command.full_name,
      phone: command.phone || null,
      jabatan: command.jabatan || null,
      is_active: command.is_active,
    })
    .eq("id", newUserId)
    .select("id");

  // .select() membuat kegagalan "0 baris terubah" jadi terlihat. Kalau profil
  // tidak tergenerate, bersihkan akun auth yang baru dibuat agar tidak
  // meninggalkan akun "yatim" (school_id NULL, tanpa role).
  if (profileError || !profileRows?.length) {
    await admin.auth.admin.deleteUser(newUserId);
    return errResult(
      serverError(
        profileError ??
          new Error("Profil user baru tidak ditemukan setelah dibuat."),
        "Gagal menyimpan profil user."
      )
    );
  }

  if (canAssignRoles(current) && command.role_ids.length > 0) {
    const failed = await insertUserRoles(
      deps.supabase,
      newUserId,
      command.role_ids,
      "User dibuat, tetapi role gagal diberikan."
    );
    if (failed) return failed;
  }

  return okResult(`User ${command.full_name} berhasil dibuat.`);
}

/** Titik masuk utama: simpan user (buat bila tanpa `id`, ubah bila dengan `id`). */
export async function saveUserRecord(
  deps: UserMutationsDeps,
  current: CurrentUser,
  command: SaveUserCommand
): Promise<MutationResult> {
  // Cegah privilege escalation sebelum operasi tulis apa pun.
  const escalationError = await assertRolesAssignable(
    deps,
    current,
    command.role_ids
  );
  if (escalationError) return errResult(escalationError);

  return command.id
    ? updateUserRecord(deps, current, command)
    : createUserRecord(deps, current, command);
}

/** Aktifkan/nonaktifkan akun user. */
export async function setUserActiveState(
  deps: Pick<UserMutationsDeps, "supabase">,
  current: CurrentUser,
  userId: string,
  isActive: boolean
): Promise<MutationResult> {
  if (userId === current.id && !isActive) {
    return errResult("Anda tidak bisa menonaktifkan akun sendiri.");
  }

  const { data: target } = await deps.supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return errResult("User tidak ditemukan.");

  const { error } = await deps.supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) {
    return errResult(serverError(error, "Gagal mengubah status user."));
  }

  return okResult(isActive ? "User diaktifkan." : "User dinonaktifkan.");
}

/** Hapus user (akun auth + baris terkait via cascade). */
export async function deleteUserAccount(
  deps: Pick<UserMutationsDeps, "supabase" | "createAdmin">,
  current: CurrentUser,
  userId: string
): Promise<MutationResult> {
  if (userId === current.id) {
    return errResult("Anda tidak bisa menghapus akun sendiri.");
  }

  const { data: target } = await deps.supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!target) return errResult("User tidak ditemukan.");

  let admin: SupabaseClient<Database>;
  try {
    admin = deps.createAdmin();
  } catch (error) {
    return errResult(
      error instanceof Error ? error.message : "Service role key belum diisi."
    );
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return errResult(serverError(error, "Gagal menghapus user."));

  return okResult("User berhasil dihapus.");
}
