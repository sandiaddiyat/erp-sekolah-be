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
  SavePlacementInput,
  SaveRoomInput,
  BulkEnrollmentInput,
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

const MAJOR_REQUIRED_LEVELS = new Set(["SMA", "SMK"]);

async function fetchGradeLevelCode(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  gradeId: string
): Promise<string | null> {
  const { data: grade, error: gradeError } = await supabase
    .from("grades")
    .select("education_level_id")
    .eq("id", gradeId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (gradeError || !grade?.education_level_id) {
    return null;
  }

  const { data: level, error: levelError } = await supabase
    .from("education_levels")
    .select("code")
    .eq("id", grade.education_level_id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (levelError || !level?.code) {
    return null;
  }

  return level.code.toUpperCase();
}

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
  const {
    id,
    academic_year_id,
    grade_id,
    major_id,
    room_id,
    homeroom_teacher_id,
    name,
    capacity,
    class_code,
    status,
    shift,
  } = payload;

  // Validasi jenjang: jurusan wajib untuk SMA/SMK, harus kosong untuk jenjang lain.
  const levelCode = await fetchGradeLevelCode(supabase, schoolId, grade_id);
  if (!levelCode) {
    return errResult("Tingkat tidak valid.");
  }
  if (MAJOR_REQUIRED_LEVELS.has(levelCode) && !major_id) {
    return errResult("Jurusan wajib diisi untuk jenjang SMA/SMK.");
  }
  if (!MAJOR_REQUIRED_LEVELS.has(levelCode) && major_id) {
    return errResult("Jurusan hanya boleh diisi untuk jenjang SMA/SMK.");
  }

  // Cegah nama kelas ganda di tingkat & tahun ajaran yang sama.
  let duplicateQuery = supabase
    .from("classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academic_year_id)
    .eq("grade_id", grade_id)
    .eq("name", name.trim());
  if (id) {
    duplicateQuery = duplicateQuery.neq("id", id);
  }
  const { data: duplicate } = await duplicateQuery.limit(1).maybeSingle();
  if (duplicate) {
    return errResult(
      "Nama kelas sudah digunakan di tingkat dan tahun ajaran yang sama."
    );
  }

  // Kode kelas unik per sekolah.
  if (class_code) {
    let codeQuery = supabase
      .from("classes")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_code", class_code);
    if (id) {
      codeQuery = codeQuery.neq("id", id);
    }
    const { data: codeExists } = await codeQuery.limit(1).maybeSingle();
    if (codeExists) {
      return errResult("Kode kelas sudah dipakai kelas lain.");
    }
  }

  if (id) {
    const { error } = await supabase
      .from("classes")
      .update({
        academic_year_id,
        grade_id,
        major_id,
        room_id,
        homeroom_teacher_id,
        name,
        capacity,
        class_code: class_code ?? null,
        status: status ?? "aktif",
        shift,
      })
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
    class_code: class_code ?? null,
    status: status ?? "aktif",
    shift,
    created_by: current.id,
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

export type ClassOccupancy =
  | { ok: true; count: number }
  | { ok: false; error: string };

export async function countActiveStudentsInClass(
  deps: AkademikMutationsDeps,
  schoolId: string,
  classId: string
): Promise<ClassOccupancy> {
  if (!schoolId) {
    return { ok: false, error: "Hanya admin sekolah yang dapat mengelola data akademik." };
  }

  const { data, error } = await deps.supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("status", "active");
  if (error) {
    return { ok: false, error: serverError(error, "Gagal menghitung siswa aktif.") };
  }
  return { ok: true, count: (data ?? []).length };
}

/**
 * Validasi kapasitas kelas saat menambahkan siswa.
 * Lewati jika kelas tidak punya capacity atau kelas tidak ditemukan.
 */
async function assertClassCapacity(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  classId: string,
  extra = 0
): Promise<MutationResult | null> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("capacity")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle<{ capacity: number | null }>();
  if (classError || !classRow || classRow.capacity === null) {
    return null;
  }

  const { data: enrolled, error: enrollError } = await supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("class_id", classId)
    .eq("status", "active");
  if (enrollError) {
    return null;
  }

  const activeCount = (enrolled ?? []).length;
  if (activeCount + extra > classRow.capacity) {
    return errResult(
      `Kapasitas kelas sudah penuh (${activeCount}/${classRow.capacity} siswa).`
    );
  }
  return null;
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
    .select("id, school_id, name, start_date")
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
    .select("grade_id, major_id, room_id, homeroom_teacher_id, name, capacity, class_code, status")
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
    .select("name, grade_id, class_code")
    .eq("school_id", schoolId)
    .eq("academic_year_id", targetYear.id);

  const normalizeName = (name: string) => name.trim().toLowerCase();
  const existingKeys = new Set(
    (targetClasses ?? []).map((c) => `${normalizeName(c.name)}|${c.grade_id}`)
  );
  const existingCodes = new Set(
    (targetClasses ?? [])
      .map((c) => c.class_code)
      .filter((code): code is string => Boolean(code))
  );

  const buildClassCode = (base: string | null): string | null => {
    if (!base) {
      return null;
    }
    const suffix = targetYear.name;
    let candidate = `${base}-${suffix}`.slice(0, 50);
    let counter = 2;
    while (existingCodes.has(candidate)) {
      const trimmed = base.slice(0, 50 - String(`-${suffix}-${counter}`).length);
      candidate = `${trimmed}-${suffix}-${counter}`;
      counter += 1;
    }
    existingCodes.add(candidate);
    return candidate;
  };

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
      class_code: buildClassCode(source.class_code),
      status: source.status ?? "aktif",
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
    // Validasi kapasitas hanya jika kelas tujuan berubah.
    const { data: currentRow } = await supabase
      .from("student_enrollments")
      .select("class_id")
      .eq("id", id)
      .eq("school_id", schoolId)
      .maybeSingle<{ class_id: string }>();
    if (currentRow && currentRow.class_id !== class_id) {
      const capacityError = await assertClassCapacity(
        supabase,
        schoolId,
        class_id,
        1
      );
      if (capacityError) return capacityError;
    }
    const { error } = await supabase
      .from("student_enrollments")
      .update(values)
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui pendaftaran.");
    return okResult("Pendaftaran berhasil diperbarui.");
  }

  const capacityError = await assertClassCapacity(
    supabase,
    schoolId,
    class_id,
    1
  );
  if (capacityError) return capacityError;

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

export async function deleteBulkEnrollmentRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  ids: string[]
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  if (ids.length === 0) {
    return okResult("Tidak ada pendaftaran yang dihapus.");
  }

  const { error } = await deps.supabase
    .from("student_enrollments")
    .delete()
    .in("id", ids)
    .eq("school_id", schoolId);
  if (error) return handleInsertError(error, "Gagal menghapus pendaftaran secara massal.");
  return okResult(`${ids.length} pendaftaran berhasil dihapus.`);
}

// ===== Bulk Enrollment Queries =====

export type AvailableStudent = {
  id: string;
  nama_lengkap: string;
  nis: string | null;
  jenis_kelamin: string | null;
  latest_prior_academic_year: string | null;
  latest_prior_class: string | null;
};

export type EditModalStudent = AvailableStudent & {
  registered: boolean;
};

export async function fetchActiveAcademicYears(
  deps: AkademikMutationsDeps,
  schoolId: string
): Promise<{ ok: true; data: Database["public"]["Tables"]["academic_years"]["Row"][] } | { ok: false; error: string }> {
  const { data, error } = await deps.supabase
    .from("academic_years")
    .select("id, school_id, name, start_date, end_date, status, is_active, created_at, updated_at")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .or(`end_date.gte.${new Date().toISOString().slice(0, 10)},start_date.gt.${new Date().toISOString().slice(0, 10)}`)
    .order("start_date", { ascending: true });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

export async function fetchAvailableStudentsForAcademicYear(
  deps: AkademikMutationsDeps,
  schoolId: string,
  academicYearId: string
): Promise<{ ok: true; data: AvailableStudent[] } | { ok: false; error: string }> {
  if (!schoolId) return { ok: false, error: "Sekolah tidak ditemukan." };

  const { data: selectedYear, error: selectedYearError } = await deps.supabase
    .from("academic_years")
    .select("id, start_date")
    .eq("id", academicYearId)
    .eq("school_id", schoolId)
    .single();
  if (selectedYearError || !selectedYear) {
    return { ok: false, error: "Tahun ajaran tidak ditemukan." };
  }

  const { data: priorYears, error: priorYearsError } = await deps.supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .lt("start_date", selectedYear.start_date);
  if (priorYearsError) return { ok: false, error: priorYearsError.message };

  const priorYearIds = (priorYears ?? []).map((year) => year.id);
  const latestHistoryByStudent = new Map<string, {
    yearName: string;
    yearStartDate: string;
    className: string | null;
    enrollmentDate: string;
    createdAt: string;
  }>();

  if (priorYearIds.length > 0) {
    const { data: historyRows, error: historyError } = await deps.supabase
      .from("student_enrollments")
      .select("student_id, enrollment_date, created_at, classes!student_enrollments_class_tenant_fkey(name), academic_years!student_enrollments_year_tenant_fkey(name, start_date)")
      .eq("school_id", schoolId)
      .in("academic_year_id", priorYearIds);
    if (historyError) return { ok: false, error: historyError.message };

    for (const row of historyRows ?? []) {
      const year = row.academic_years as unknown as { name: string; start_date: string } | null;
      const schoolClass = row.classes as unknown as { name: string | null } | null;
      if (!year) continue;
      const current = latestHistoryByStudent.get(row.student_id);
      const isLater = !current ||
        year.start_date > current.yearStartDate ||
        (year.start_date === current.yearStartDate && row.enrollment_date > current.enrollmentDate) ||
        (year.start_date === current.yearStartDate && row.enrollment_date === current.enrollmentDate && row.created_at > current.createdAt);
      if (isLater) {
        latestHistoryByStudent.set(row.student_id, {
          yearName: year.name,
          yearStartDate: year.start_date,
          className: schoolClass?.name ?? null,
          enrollmentDate: row.enrollment_date,
          createdAt: row.created_at,
        });
      }
    }
  }

  const { data: enrolledRows, error: enrollmentError } = await deps.supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId);
  if (enrollmentError) return { ok: false, error: enrollmentError.message };
  const enrolledIds = new Set((enrolledRows ?? []).map((row) => row.student_id));

  let query = deps.supabase
    .from("students")
    .select("id, nama_lengkap, nis, jenis_kelamin")
    .eq("school_id", schoolId)
    .eq("status", "aktif")
    .order("nama_lengkap", { ascending: true });
  if (enrolledIds.size > 0) {
    query = query.not("id", "in", `(${Array.from(enrolledIds).join(",")})`);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: (data ?? []).map((student) => {
      const history = latestHistoryByStudent.get(student.id);
      return {
        ...student,
        latest_prior_academic_year: history?.yearName ?? null,
        latest_prior_class: history?.className ?? null,
      };
    }),
  };
}

// ===== Bulk Enrollment =====

export async function saveBulkEnrollmentRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: BulkEnrollmentInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { academic_year_id, class_id, enrollment_date, exit_date, status, siswa_ids } = payload;

  const capacityError = await assertClassCapacity(
    supabase,
    schoolId,
    class_id,
    siswa_ids.length
  );
  if (capacityError) return capacityError;

  const values = {
    school_id: schoolId,
    academic_year_id,
    class_id,
    enrollment_date,
    exit_date: exit_date ?? null,
    status,
  };

  const rows = siswa_ids.map((student_id) => ({ ...values, student_id }));

  const { error } = await supabase.from("student_enrollments").insert(rows);
  if (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = (error as { message?: string } | null)?.message ?? "";
    if (code === "23505" || /duplicate key/i.test(message)) {
      return errResult("Beberapa siswa sudah terdaftar di tahun ajaran ini.");
    }
    if (code === "23503" || /foreign key/i.test(message)) {
      return errResult("Data yang dipilih tidak valid atau sudah tidak tersedia.");
    }
    return errResult(serverError(error, "Gagal mendaftarkan siswa."));
  }

  return okResult(`${siswa_ids.length} siswa berhasil didaftarkan.`);
}

export async function fetchClassRoster(
  deps: AkademikMutationsDeps,
  schoolId: string,
  academicYearId: string,
  classId: string
): Promise<{ ok: true; data: AvailableStudent[] } | { ok: false; error: string }> {
  if (!schoolId) return { ok: false, error: "Sekolah tidak ditemukan." };

  const { data: classRow, error: classError } = await deps.supabase
    .from("classes")
    .select("name, academic_years!classes_academic_year_tenant_fkey(name)")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .single();
  if (classError || !classRow) return { ok: false, error: "Kelas tidak ditemukan." };

  const year = classRow.academic_years as unknown as { name: string } | null;

  const { data: members, error: memberError } = await deps.supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("class_id", classId);
  if (memberError) return { ok: false, error: memberError.message };

  const memberIds = (members ?? []).map((row) => row.student_id);
  if (memberIds.length === 0) return { ok: true, data: [] };

  const { data: students, error: studentError } = await deps.supabase
    .from("students")
    .select("id, nama_lengkap, nis, jenis_kelamin")
    .in("id", memberIds)
    .eq("school_id", schoolId)
    .order("nama_lengkap", { ascending: true });
  if (studentError) return { ok: false, error: studentError.message };

  return {
    ok: true,
    data: (students ?? []).map((student) => ({
      ...student,
      latest_prior_academic_year: year?.name ?? null,
      latest_prior_class: classRow.name,
    })),
  };
}

export async function fetchClassRosterWithAvailable(
  deps: AkademikMutationsDeps,
  schoolId: string,
  academicYearId: string,
  classId: string
): Promise<{ ok: true; data: EditModalStudent[] } | { ok: false; error: string }> {
  const rosterResult = await fetchClassRoster(deps, schoolId, academicYearId, classId);
  if (!rosterResult.ok) return { ok: false, error: rosterResult.error };

  const availableResult = await fetchAvailableStudentsForAcademicYear(deps, schoolId, academicYearId);
  if (!availableResult.ok) return { ok: false, error: availableResult.error };

  const merged: EditModalStudent[] = [
    ...rosterResult.data.map((s) => ({ ...s, registered: true })),
    ...availableResult.data.map((s) => ({ ...s, registered: false })),
  ].sort((a, b) => a.nama_lengkap.localeCompare(b.nama_lengkap, "id"));

  return { ok: true, data: merged };
}

export async function saveBulkEnrollmentDiffRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: BulkEnrollmentInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const { academic_year_id, class_id, enrollment_date, exit_date, status, siswa_ids } = payload;

  const { data: existingRows, error: existingError } = await supabase
    .from("student_enrollments")
    .select("id, student_id, status")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academic_year_id)
    .eq("class_id", class_id);
  if (existingError) return errResult(serverError(existingError, "Gagal membaca pendaftaran kelas."));

  const existingIds = new Set((existingRows ?? []).map((row) => row.student_id));
  const toRemove = (existingRows ?? [])
    .filter((row) => !siswa_ids.includes(row.student_id))
    .map((row) => row.id);
  const toAdd = siswa_ids.filter((id) => !existingIds.has(id));

  // Validasi kapasitas dengan proyeksi: siswa yang dikeluarkan sudah tidak dihitung.
  const { data: classRow } = await supabase
    .from("classes")
    .select("capacity")
    .eq("id", class_id)
    .eq("school_id", schoolId)
    .maybeSingle<{ capacity: number | null }>();
  if (classRow && classRow.capacity !== null) {
    const removeIds = new Set(toRemove);
    const activeCount = (existingRows ?? []).filter(
      (row) => row.status === "active"
    ).length;
    const removedActive = (existingRows ?? []).filter(
      (row) => removeIds.has(row.id) && row.status === "active"
    ).length;
    const projected = activeCount - removedActive + toAdd.length;
    if (projected > classRow.capacity) {
      return errResult(
        `Kapasitas kelas sudah penuh (${projected}/${classRow.capacity} siswa).`
      );
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("student_enrollments")
      .delete()
      .in("id", toRemove)
      .eq("school_id", schoolId);
    if (deleteError) return errResult(serverError(deleteError, "Gagal mengeluarkan siswa dari kelas."));
  }

  if (toAdd.length > 0) {
    const values = {
      school_id: schoolId,
      academic_year_id,
      class_id,
      enrollment_date,
      exit_date: exit_date ?? null,
      status,
    };
    const { error: insertError } = await supabase
      .from("student_enrollments")
      .insert(toAdd.map((student_id) => ({ ...values, student_id })));
    if (insertError) {
      const code = (insertError as { code?: string } | null)?.code;
      const message = (insertError as { message?: string } | null)?.message ?? "";
      if (code === "23505" || /duplicate key/i.test(message)) {
        return errResult("Beberapa siswa sudah terdaftar di tahun ajaran ini.");
      }
      if (code === "23503" || /foreign key/i.test(message)) {
        return errResult("Data yang dipilih tidak valid atau sudah tidak tersedia.");
      }
      return errResult(serverError(insertError, "Gagal menambahkan siswa ke kelas."));
    }
  }

  return okResult(`${toAdd.length} siswa ditambahkan, ${toRemove.length} siswa dikeluarkan dari kelas.`);
}

// ===== Class Placement (Issue #104) =====

type PlacementClassRow = {
  id: string;
  name: string;
  major_id: string | null;
  capacity: number | null;
};

/**
 * Validasi aturan bisnis untuk satu penempatan siswa:
 * - kelas harus milik sekolah, tahun ajaran, dan tingkat yang dipilih;
 * - kapasitas kelas tidak boleh terlampaui.
 */
async function assertPlacementAllowed(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  academicYearId: string,
  gradeId: string,
  classId: string,
  extra = 1
): Promise<MutationResult | null> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, name, major_id, capacity, academic_year_id, grade_id")
    .eq("id", classId)
    .eq("school_id", schoolId)
    .maybeSingle<PlacementClassRow & { academic_year_id: string; grade_id: string }>();
  if (classError || !classRow) {
    return errResult("Kelas tujuan tidak ditemukan.");
  }
  if (classRow.academic_year_id !== academicYearId) {
    return errResult("Kelas tujuan tidak sesuai dengan tahun ajaran yang dipilih.");
  }
  if (classRow.grade_id !== gradeId) {
    return errResult("Kelas tujuan tidak sesuai dengan tingkat yang dipilih.");
  }

  if (classRow.capacity !== null) {
    const { data: enrolled, error: enrollError } = await supabase
      .from("student_enrollments")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_id", classId)
      .eq("status", "active");
    if (enrollError) return null;
    const activeCount = (enrolled ?? []).length;
    if (activeCount + extra > classRow.capacity) {
      return errResult(
        `Kapasitas kelas sudah penuh (${activeCount}/${classRow.capacity} siswa).`
      );
    }
  }

  return null;
}

export async function savePlacementRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  payload: SavePlacementInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { supabase } = deps;
  const {
    id,
    student_id,
    academic_year_id,
    class_id,
    enrollment_date,
    exit_date,
    status,
    placement_status,
  } = payload;

  const { data: classRow } = await supabase
    .from("classes")
    .select("grade_id, major_id")
    .eq("id", class_id)
    .eq("school_id", schoolId)
    .maybeSingle<{ grade_id: string; major_id: string | null }>();
  if (!classRow) {
    return errResult("Kelas tujuan tidak ditemukan.");
  }

  const placementError = await assertPlacementAllowed(
    supabase,
    schoolId,
    academic_year_id,
    classRow.grade_id,
    class_id,
    id ? 0 : 1
  );
  if (placementError) return placementError;

  const values = {
    student_id,
    academic_year_id,
    class_id,
    enrollment_date,
    exit_date: exit_date ?? null,
    status,
    placement_status,
  };

  if (id) {
    const { error } = await supabase
      .from("student_enrollments")
      .update(values)
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleInsertError(error, "Gagal memperbarui penempatan.");
    return okResult("Penempatan siswa berhasil diperbarui.");
  }

  const { error } = await supabase
    .from("student_enrollments")
    .insert({ ...values, school_id: schoolId });
  if (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = (error as { message?: string } | null)?.message ?? "";
    if (code === "23505" || /duplicate key/i.test(message)) {
      return errResult("Siswa sudah terdaftar pada tahun ajaran ini.");
    }
    return handleInsertError(error, "Gagal menempatkan siswa.");
  }
  return okResult("Siswa berhasil ditempatkan ke kelas.");
}

export type UnplacedStudent = {
  id: string;
  nama_lengkap: string;
  nis: string | null;
  jenis_kelamin: string | null;
};

export async function fetchUnplacedStudents(
  deps: AkademikMutationsDeps,
  schoolId: string,
  academicYearId: string
): Promise<{ ok: true; data: UnplacedStudent[] } | { ok: false; error: string }> {
  if (!schoolId) return { ok: false, error: "Sekolah tidak ditemukan." };

  const { data: enrolled, error: enrolledError } = await deps.supabase
    .from("student_enrollments")
    .select("student_id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId);
  if (enrolledError) return { ok: false, error: enrolledError.message };

  const enrolledIds = new Set((enrolled ?? []).map((row) => row.student_id));
  const { data, error } = await deps.supabase
    .from("students")
    .select("id, nama_lengkap, nis, jenis_kelamin")
    .eq("school_id", schoolId)
    .eq("status", "aktif")
    .order("nama_lengkap");
  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: (data ?? []).filter((student) => !enrolledIds.has(student.id)),
  };
}

export type DraftPlacementResult =
  | { ok: true; created: number; unplaced: number }
  | { ok: false; error: string };

/**
 * Generate draft placement round-robin: distribute siswa yang belum
 * ditempatkan ke kelas pada tingkat terpilih, melewati kelas yang penuh.
 */
export async function generateDraftPlacement(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  academicYearId: string,
  gradeId: string,
  placementStatus: "draft" | "final" = "draft"
): Promise<DraftPlacementResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return { ok: false, error: "Hanya admin sekolah yang dapat mengelola data akademik." };
  }

  const { supabase } = deps;

  const { data: classes, error: classError } = await supabase
    .from("classes")
    .select("id, capacity")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("grade_id", gradeId)
    .order("name");
  if (classError) return { ok: false, error: classError.message };
  if (!classes || classes.length === 0) {
    return { ok: false, error: "Tidak ada kelas yang dibuka pada tingkat ini." };
  }

  const { data: yearRow } = await supabase
    .from("academic_years")
    .select("start_date, end_date")
    .eq("id", academicYearId)
    .eq("school_id", schoolId)
    .maybeSingle<{ start_date: string; end_date: string }>();
  if (!yearRow) {
    return { ok: false, error: "Tahun ajaran tidak ditemukan." };
  }

  const unplaced = await fetchUnplacedStudents(deps, schoolId, academicYearId);
  if (!unplaced.ok) return unplaced;
  if (unplaced.data.length === 0) {
    return { ok: false, error: "Tidak ada siswa yang belum ditempatkan." };
  }

  const { data: enrolledRows, error: enrolledError } = await supabase
    .from("student_enrollments")
    .select("class_id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId);
  if (enrolledError) return { ok: false, error: enrolledError.message };

  const counts = new Map<string, number>();
  for (const classId of classes.map((c) => c.id)) {
    counts.set(classId, 0);
  }
  for (const row of enrolledRows ?? []) {
    if (!row.class_id) continue;
    counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1);
  }

  const rows: Database["public"]["Tables"]["student_enrollments"]["Insert"][] = [];
  let unplacedCount = 0;
  let cursor = 0;

  for (const student of unplaced.data) {
    // Round-robin: mulai dari kelas berikutnya yang masih punya sisa kapasitas.
    let target: (typeof classes)[number] | undefined;
    for (let step = 0; step < classes.length; step += 1) {
      const candidate = classes[(cursor + step) % classes.length];
      if (candidate.capacity === null || (counts.get(candidate.id) ?? 0) < candidate.capacity) {
        target = candidate;
        cursor = (cursor + step + 1) % classes.length;
        break;
      }
    }
    if (!target) {
      unplacedCount += 1;
      continue;
    }
    counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
    rows.push({
      school_id: schoolId,
      student_id: student.id,
      academic_year_id: academicYearId,
      class_id: target.id,
      enrollment_date: yearRow.start_date.slice(0, 10),
      exit_date: null,
      status: "active",
      placement_status: placementStatus,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("student_enrollments").insert(rows);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true, created: rows.length, unplaced: unplacedCount };
}

export async function finalizePlacementRecord(
  deps: AkademikMutationsDeps,
  current: CurrentUser,
  academicYearId: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola data akademik.");
  }

  const { error } = await deps.supabase
    .from("student_enrollments")
    .update({ placement_status: "final" })
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("placement_status", "draft");
  if (error) return handleInsertError(error, "Gagal memfinalisasi penempatan.");
  return okResult("Data penempatan berhasil difinalisasi.");
}
