import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import { slugify } from "@/lib/slug";
import type { CurrentUser, SchoolStatus } from "@/lib/types";
import type { SaveSchoolCommand } from "./schema";

/**
 * Service layer fitur schools: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dibutuhkan dependency (client
 * Supabase) lewat parameter sehingga bisa di-mock saat testing.
 */
export type SchoolMutationsDeps = {
  /** Client RLS (membawa identitas user yang sedang login). */
  supabase: SupabaseClient<Database>;
  /** Factory service-role client; melempar bila env belum diisi. */
  createAdmin: () => SupabaseClient<Database>;
};

/** Simpan atau ganti catatan internal sekolah. */
async function saveSchoolNote(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  note: string | null
): Promise<MutationResult | null> {
  const { error: deleteError } = await supabase
    .from("school_notes")
    .delete()
    .eq("school_id", schoolId);

  if (deleteError) {
    return errResult(serverError(deleteError, "Gagal menyimpan catatan sekolah."));
  }

  if (note) {
    const { error: insertError } = await supabase
      .from("school_notes")
      .insert({ school_id: schoolId, note });
    if (insertError) {
      return errResult(serverError(insertError, "Gagal menyimpan catatan sekolah."));
    }
  }

  return null;
}

/** Buat akun auth + profile admin pertama untuk sekolah yang baru dibuat. */
async function createSchoolAdmin(
  deps: SchoolMutationsDeps,
  schoolId: string,
  command: SaveSchoolCommand
): Promise<MutationResult | null> {
  if (!command.create_admin) return null;

  let admin: SupabaseClient<Database>;
  try {
    admin = deps.createAdmin();
  } catch (error) {
    return errResult(
      error instanceof Error ? error.message : "Service role key belum dikonfigurasi."
    );
  }

  const { data: created, error: adminError } = await admin.auth.admin.createUser({
    email: (command.admin_email as string).toLowerCase(),
    password: command.admin_password as string,
    email_confirm: true,
    user_metadata: { full_name: command.admin_name },
  });

  if (adminError || !created?.user) {
    return errResult(
      serverError(adminError, "Sekolah sudah dibuat, tetapi akun admin gagal dibuat.")
    );
  }

  const adminUserId = created.user.id;

  const { error: profileError } = await deps.supabase
    .from("profiles")
    .update({
      school_id: schoolId,
      full_name: command.admin_name,
      jabatan: "Administrator",
      is_active: true,
    })
    .eq("id", adminUserId);

  if (profileError) {
    return errResult(
      serverError(profileError, "Akun admin dibuat, tetapi gagal dihubungkan ke sekolah.")
    );
  }

  const { data: role } = await deps.supabase
    .from("roles")
    .select("id")
    .eq("school_id", schoolId)
    .eq("slug", "admin_sekolah")
    .maybeSingle();

  if (role?.id) {
    const { error: roleError } = await deps.supabase.from("user_roles").insert({
      user_id: adminUserId,
      role_id: role.id,
    });

    if (roleError) {
      return errResult(
        serverError(roleError, "Admin dibuat, tetapi role gagal diberikan.")
      );
    }
  }

  return null;
}

/** Ubah data sekolah yang sudah ada. */
async function updateSchoolRecord(
  deps: SchoolMutationsDeps,
  command: SaveSchoolCommand
): Promise<MutationResult> {
  const { supabase } = deps;
  const schoolId = command.id as string;

  const { data: target } = await supabase
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();

  if (!target) return errResult("Sekolah tidak ditemukan.");

  const { error } = await supabase
    .from("schools")
    .update({
      name: command.name,
      npsn: command.npsn || null,
      level: command.level || null,
      address: command.address || null,
      phone: command.phone || null,
      email: command.email,
      status: command.status,
      active_until: command.active_until,
      is_active: command.status !== "suspended",
    })
    .eq("id", schoolId);

  if (error) return errResult(serverError(error, "Gagal memperbarui sekolah."));

  const noteError = await saveSchoolNote(supabase, schoolId, command.notes || null);
  if (noteError) return noteError;

  return okResult(`Data ${command.name} berhasil diperbarui.`);
}

/** Daftarkan sekolah baru via RPC create_school. */
async function createSchoolRecord(
  deps: SchoolMutationsDeps,
  command: SaveSchoolCommand
): Promise<MutationResult> {
  const { supabase } = deps;

  const slug = slugify(command.slug || command.name, "-", "sekolah");

  const { data: createdId, error: createError } = await supabase.rpc("create_school", {
    p_name: command.name,
    p_slug: slug,
    p_npsn: command.npsn || null,
    p_level: command.level || null,
    p_address: command.address || null,
    p_phone: command.phone || null,
    p_email: command.email,
    p_status: command.status,
    p_active_until: command.active_until,
  });

  if (createError || !createdId) {
    if (
      createError?.code === "23505" ||
      /duplicate key/i.test(createError?.message ?? "")
    ) {
      return errResult(`Slug "${slug}" sudah dipakai sekolah lain.`);
    }
    return errResult(serverError(createError, "Gagal membuat sekolah."));
  }

  const schoolId = createdId as string;

  const noteError = await saveSchoolNote(supabase, schoolId, command.notes || null);
  if (noteError) return noteError;

  const adminError = await createSchoolAdmin(deps, schoolId, command);
  if (adminError) return adminError;

  return okResult(`Sekolah ${command.name} berhasil didaftarkan.`);
}

/** Ubah status sekolah (aktif / non-aktif / suspend). */
async function changeSchoolStatus(
  deps: Pick<SchoolMutationsDeps, "supabase">,
  schoolId: string,
  status: SchoolStatus
): Promise<MutationResult> {
  const { supabase } = deps;

  const { data: target } = await supabase
    .from("schools")
    .select("id, name")
    .eq("id", schoolId)
    .maybeSingle();

  if (!target) return errResult("Sekolah tidak ditemukan.");

  const { error } = await supabase
    .from("schools")
    .update({ status, is_active: status !== "suspended" })
    .eq("id", schoolId);

  if (error) return errResult(serverError(error, "Gagal mengubah status sekolah."));

  return okResult(
    `${target.name} ${status === "suspended" ? "dihentikan sementara" : "diaktifkan kembali"}.`
  );
}

/** Titik masuk utama: simpan sekolah (buat bila tanpa `id`, ubah bila dengan `id`). */
export async function saveSchoolRecord(
  deps: SchoolMutationsDeps,
  command: SaveSchoolCommand
): Promise<MutationResult> {
  return command.id
    ? updateSchoolRecord(deps, command)
    : createSchoolRecord(deps, command);
}

export async function setSchoolStatusRecord(
  deps: Pick<SchoolMutationsDeps, "supabase">,
  schoolId: string,
  status: SchoolStatus
): Promise<MutationResult> {
  return changeSchoolStatus(deps, schoolId, status);
}
