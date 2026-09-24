import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type {
  SaveAcademicYearInput,
  SaveClassInput,
  SaveEducationLevelInput,
  SaveEnrollmentInput,
  SaveGradeInput,
  SaveMajorInput,
  SaveRoomInput,
} from "./schema";

/**
 * Service layer fitur akademik: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dependency (client Supabase) di-inject
 * lewat parameter sehingga bisa di-mock saat testing.
 */
export type AkademikMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Data dengan kombinasi yang sama sudah ada.";
  }
  return null;
}

function constraintMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  if (code === "23503" || /foreign key/i.test((error as { message?: string } | null)?.message ?? "")) {
    return "Data yang dipilih tidak valid atau sudah tidak tersedia.";
  }
  return null;
}

const handleInsertError = (error: unknown, fallback: string) =>
  errResult(serverError(error, duplicateMessage(error) ?? constraintMessage(error) ?? fallback));

// ===== Academic Years =====

export async function saveAcademicYearRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveAcademicYearInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, name, start_date, end_date, status, is_active } = payload;

  if (is_active) {
    // Non-aktifkan semua tahun ajaran lain sebelumnya agar hanya ada satu aktif.
    await supabase
      .from("academic_years")
      .update({ is_active: false, status: "closed" })
      .eq("school_id", schoolId)
      .neq("id", id ?? "");
  }

  if (id) {
    const { error } = await supabase
      .from("academic_years")
      .update({ name, start_date, end_date, status, is_active })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui tahun ajaran.");
    return okResult("Tahun ajaran berhasil diperbarui.");
  }

  const { error } = await supabase.from("academic_years").insert({
    school_id: schoolId,
    name,
    start_date,
    end_date,
    status,
    is_active,
  });
  if (error) return handleInsertError(error, "Gagal menambahkan tahun ajaran.");
  return okResult("Tahun ajaran berhasil ditambahkan.");
}

export async function deleteAcademicYearRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("academic_years")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus tahun ajaran.");
  return okResult("Tahun ajaran berhasil dihapus.");
}

// ===== Education Levels =====

export async function saveEducationLevelRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveEducationLevelInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, code, name } = payload;

  if (id) {
    const { error } = await supabase
      .from("education_levels")
      .update({ code, name })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui jenjang.");
    return okResult("Jenjang berhasil diperbarui.");
  }

  const { error } = await supabase.from("education_levels").insert({
    school_id: schoolId,
    code,
    name,
  });
  if (error) return handleInsertError(error, "Gagal menambahkan jenjang.");
  return okResult("Jenjang berhasil ditambahkan.");
}

export async function deleteEducationLevelRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("education_levels")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus jenjang.");
  return okResult("Jenjang berhasil dihapus.");
}

// ===== Grades =====

export async function saveGradeRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveGradeInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, education_level_id, name, sort_order } = payload;

  if (id) {
    const { error } = await supabase
      .from("grades")
      .update({ education_level_id, name, sort_order })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui tingkat.");
    return okResult("Tingkat berhasil diperbarui.");
  }

  const { error } = await supabase.from("grades").insert({
    school_id: schoolId,
    education_level_id,
    name,
    sort_order,
  });
  if (error) return handleInsertError(error, "Gagal menambahkan tingkat.");
  return okResult("Tingkat berhasil ditambahkan.");
}

export async function deleteGradeRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("grades")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus tingkat.");
  return okResult("Tingkat berhasil dihapus.");
}

// ===== Rooms =====

export async function saveRoomRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveRoomInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, name, type, capacity } = payload;

  if (id) {
    const { error } = await supabase
      .from("rooms")
      .update({ name, type, capacity })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui ruangan.");
    return okResult("Ruangan berhasil diperbarui.");
  }

  const { error } = await supabase.from("rooms").insert({
    school_id: schoolId,
    name,
    type,
    capacity,
  });
  if (error) return handleInsertError(error, "Gagal menambahkan ruangan.");
  return okResult("Ruangan berhasil ditambahkan.");
}

export async function deleteRoomRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("rooms")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus ruangan.");
  return okResult("Ruangan berhasil dihapus.");
}

// ===== Majors =====

export async function saveMajorRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveMajorInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, education_level_id, name } = payload;

  if (id) {
    const { error } = await supabase
      .from("majors")
      .update({ education_level_id, name })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui jurusan.");
    return okResult("Jurusan berhasil diperbarui.");
  }

  const { error } = await supabase.from("majors").insert({
    school_id: schoolId,
    education_level_id,
    name,
  });
  if (error) return handleInsertError(error, "Gagal menambahkan jurusan.");
  return okResult("Jurusan berhasil ditambahkan.");
}

export async function deleteMajorRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("majors")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus jurusan.");
  return okResult("Jurusan berhasil dihapus.");
}

// ===== Classes =====

export async function saveClassRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveClassInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, academic_year_id, grade_id, major_id, room_id, homeroom_teacher_id, name, capacity } = payload;

  if (id) {
    const { error } = await supabase
      .from("classes")
      .update({ academic_year_id, grade_id, major_id, room_id, homeroom_teacher_id, name, capacity })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui kelas.");
    return okResult("Kelas berhasil diperbarui.");
  }

  const { error } = await supabase.from("classes").insert({
    school_id: schoolId,
    academic_year_id,
    grade_id,
    major_id,
    room_id,
    homeroom_teacher_id,
    name,
    capacity,
  });
  if (error) return handleInsertError(error, "Gagal menambahkan kelas.");
  return okResult("Kelas berhasil ditambahkan.");
}

export async function deleteClassRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus kelas.");
  return okResult("Kelas berhasil dihapus.");
}

export type CopyClassesResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };

export async function copyClassesFromPreviousYear(
  deps: AkademikMutationsDeps,
  schoolId: string,
  targetYearId: string
): Promise<CopyClassesResult> {
  if (!schoolId) {
    return { ok: false, error: "Hanya admin sekolah yang dapat mengelola data akademik." };
  }

  const { supabase } = deps;

  const { data: targetYear, error: targetError } = await supabase
    .from("academic_years")
    .select("id, school_id, start_date")
    .eq("id", targetYearId)
    .eq("school_id", schoolId)
    .single();
  if (targetError || !targetYear) {
    return { ok: false, error: "Tahun ajaran tujuan tidak ditemukan." };
  }

  const { data: sourceYear } = await supabase
    .from("academic_years")
    .select("id, name, start_date")
    .eq("school_id", schoolId)
    .lt("start_date", targetYear.start_date)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sourceYear) {
    return { ok: false, error: "Tidak ada tahun ajaran sebelumnya." };
  }

  const { data: sourceClasses } = await supabase
    .from("classes")
    .select("grade_id, major_id, room_id, homeroom_teacher_id, name, capacity")
    .eq("school_id", schoolId)
    .eq("academic_year_id", sourceYear.id);
  if (!sourceClasses || sourceClasses.length === 0) {
    return {
      ok: false,
      error: `Tidak ada kelas pada tahun ajaran "${sourceYear.name}" untuk disalin.`,
    };
  }

  const { data: targetClasses } = await supabase
    .from("classes")
    .select("name, grade_id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", targetYear.id);

  const normalizeName = (name: string) => name.trim().toLowerCase();
  const existingKeys = new Set(
    (targetClasses ?? []).map((c) => `${normalizeName(c.name)}|${c.grade_id}`)
  );

  let skipped = 0;
  const rows: Database["public"]["Tables"]["classes"]["Insert"][] = [];
  for (const source of sourceClasses) {
    const key = `${normalizeName(source.name)}|${source.grade_id}`;
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    existingKeys.add(key);
    rows.push({
      school_id: schoolId,
      academic_year_id: targetYear.id,
      grade_id: source.grade_id,
      major_id: source.major_id,
      room_id: source.room_id,
      homeroom_teacher_id: source.homeroom_teacher_id,
      name: source.name,
      capacity: source.capacity,
    });
  }

  if (rows.length === 0) {
    return { ok: true, created: 0, skipped };
  }

  const { error: insertError } = await supabase.from("classes").insert(rows);
  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, created: rows.length, skipped };
}

// ===== Student Enrollments =====

export async function saveEnrollmentRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SaveEnrollmentInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { id, student_id, academic_year_id, class_id, enrollment_date, exit_date, status } = payload;
  const values = {
    school_id: schoolId,
    student_id,
    academic_year_id,
    class_id,
    enrollment_date,
    exit_date,
    status,
  };

  if (id) {
    const { error } = await supabase
      .from("student_enrollments")
      .update(values)
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui pendaftaran.");
    return okResult("Pendaftaran berhasil diperbarui.");
  }

  const { error } = await supabase.from("student_enrollments").insert(values);
  if (error) return handleInsertError(error, "Gagal mendaftarkan siswa.");
  return okResult("Siswa berhasil didaftarkan ke kelas.");
}

export async function deleteEnrollmentRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("student_enrollments")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus pendaftaran.");
  return okResult("Pendaftaran berhasil dihapus.");
}
