import { z } from "zod";

/**
 * Kontrak input untuk CRUD modul akademik.
 * Satu-satunya tempat yang tahu nama-nama field form akademik.
 */

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || z.uuid().safeParse(v).success, "ID tidak valid.");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid.");

const requiredName = (min: number, label: string) =>
  z.string().trim().min(min, `${label} minimal ${min} karakter`);

function readCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on" || value === "1";
}

// ===== Academic Years =====

export const saveAcademicYearSchema = z
  .object({
    id: optionalUuid,
    name: requiredName(3, "Nama tahun ajaran"),
    start_date: z
      .string()
      .trim()
      .min(1, "Tanggal mulai wajib diisi")
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid."),
    end_date: z
      .string()
      .trim()
      .min(1, "Tanggal selesai wajib diisi")
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid."),
    status: z.enum(["draft", "active", "closed"]).default("draft"),
    is_active: z.boolean().default(false),
  })
  .refine(
    (data) => data.end_date >= data.start_date,
    { message: "Tanggal selesai tidak boleh sebelum tanggal mulai." }
  );

export type SaveAcademicYearInput = z.infer<typeof saveAcademicYearSchema>;

export type SaveAcademicYearParseResult =
  | { ok: true; command: SaveAcademicYearInput }
  | { ok: false; error: string };

export function readSaveAcademicYearInput(
  formData: FormData
): SaveAcademicYearParseResult {
  const parsed = saveAcademicYearSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    start_date: formData.get("start_date") ?? "",
    end_date: formData.get("end_date") ?? "",
    status: formData.get("status") ?? "draft",
    is_active: readCheckbox(formData.get("is_active")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Education Levels =====

export const saveEducationLevelSchema = z.object({
  id: optionalUuid,
  code: requiredName(1, "Kode jenjang"),
  name: requiredName(2, "Nama jenjang"),
});

export type SaveEducationLevelInput = z.infer<typeof saveEducationLevelSchema>;

export type SaveEducationLevelParseResult =
  | { ok: true; command: SaveEducationLevelInput }
  | { ok: false; error: string };

export function readSaveEducationLevelInput(
  formData: FormData
): SaveEducationLevelParseResult {
  const parsed = saveEducationLevelSchema.safeParse({
    id: formData.get("id") ?? "",
    code: formData.get("code") ?? "",
    name: formData.get("name") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Grades =====

export const saveGradeSchema = z.object({
  id: optionalUuid,
  education_level_id: z
    .string()
    .trim()
    .min(1, "Jenjang wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Jenjang tidak valid."),
  name: requiredName(2, "Nama tingkat"),
  sort_order: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : 0)),
});

export type SaveGradeInput = z.infer<typeof saveGradeSchema>;

export type SaveGradeParseResult =
  | { ok: true; command: SaveGradeInput }
  | { ok: false; error: string };

export function readSaveGradeInput(formData: FormData): SaveGradeParseResult {
  const parsed = saveGradeSchema.safeParse({
    id: formData.get("id") ?? "",
    education_level_id: formData.get("education_level_id") ?? "",
    name: formData.get("name") ?? "",
    sort_order: formData.get("sort_order") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Rooms =====

export const saveRoomSchema = z.object({
  id: optionalUuid,
  name: requiredName(2, "Nama ruangan"),
  type: z.string().trim().optional().transform((v) => v || undefined),
  capacity: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null)),
});

export type SaveRoomInput = z.infer<typeof saveRoomSchema>;

export type SaveRoomParseResult =
  | { ok: true; command: SaveRoomInput }
  | { ok: false; error: string };

export function readSaveRoomInput(formData: FormData): SaveRoomParseResult {
  const parsed = saveRoomSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    type: formData.get("type") ?? "",
    capacity: formData.get("capacity") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Majors =====

export const saveMajorSchema = z.object({
  id: optionalUuid,
  education_level_id: z
    .string()
    .trim()
    .min(1, "Jenjang wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Jenjang tidak valid."),
  name: requiredName(2, "Nama jurusan"),
});

export type SaveMajorInput = z.infer<typeof saveMajorSchema>;

export type SaveMajorParseResult =
  | { ok: true; command: SaveMajorInput }
  | { ok: false; error: string };

export function readSaveMajorInput(formData: FormData): SaveMajorParseResult {
  const parsed = saveMajorSchema.safeParse({
    id: formData.get("id") ?? "",
    education_level_id: formData.get("education_level_id") ?? "",
    name: formData.get("name") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Classes =====

export const saveClassSchema = z.object({
  id: optionalUuid,
  academic_year_id: z
    .string()
    .trim()
    .min(1, "Tahun ajaran wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Tahun ajaran tidak valid."),
  grade_id: z
    .string()
    .trim()
    .min(1, "Tingkat wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Tingkat tidak valid."),
  major_id: optionalUuid,
  room_id: optionalUuid,
  homeroom_teacher_id: optionalUuid,
  name: requiredName(2, "Nama kelas"),
  capacity: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null)),
});

export type SaveClassInput = z.infer<typeof saveClassSchema>;

export type SaveClassParseResult =
  | { ok: true; command: SaveClassInput }
  | { ok: false; error: string };

export function readSaveClassInput(formData: FormData): SaveClassParseResult {
  const parsed = saveClassSchema.safeParse({
    id: formData.get("id") ?? "",
    academic_year_id: formData.get("academic_year_id") ?? "",
    grade_id: formData.get("grade_id") ?? "",
    major_id: formData.get("major_id") ?? "",
    room_id: formData.get("room_id") ?? "",
    homeroom_teacher_id: formData.get("homeroom_teacher_id") ?? "",
    name: formData.get("name") ?? "",
    capacity: formData.get("capacity") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Copy Classes from Previous Year =====

export const copyClassesSchema = z.object({
  targetYearId: z
    .string()
    .trim()
    .min(1, "Tahun ajaran tujuan wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Tahun ajaran tujuan tidak valid."),
});

export type CopyClassesInput = z.infer<typeof copyClassesSchema>;

export type CopyClassesParseResult =
  | { ok: true; command: CopyClassesInput }
  | { ok: false; error: string };

export function readCopyClassesInput(formData: FormData): CopyClassesParseResult {
  const parsed = copyClassesSchema.safeParse({
    targetYearId: formData.get("targetYearId") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

// ===== Student Enrollments =====

export const saveEnrollmentSchema = z
  .object({
    id: optionalUuid,
    student_id: z
      .string()
      .trim()
      .min(1, "Siswa wajib dipilih")
      .refine((v) => z.uuid().safeParse(v).success, "Siswa tidak valid."),
    academic_year_id: z
      .string()
      .trim()
      .min(1, "Tahun ajaran wajib dipilih")
      .refine((v) => z.uuid().safeParse(v).success, "Tahun ajaran tidak valid."),
    class_id: z
      .string()
      .trim()
      .min(1, "Kelas wajib dipilih")
      .refine((v) => z.uuid().safeParse(v).success, "Kelas tidak valid."),
    enrollment_date: z
      .string()
      .trim()
      .min(1, "Tanggal pendaftaran wajib diisi")
      .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid."),
    exit_date: optionalDate,
    status: z
      .enum(["active", "keluar", "pindah", "lulus"])
      .default("active"),
  })
  .refine(
    (data) =>
      !data.exit_date ||
      !data.enrollment_date ||
      data.exit_date >= data.enrollment_date,
    { message: "Tanggal keluar tidak boleh sebelum tanggal pendaftaran." }
  );

export type SaveEnrollmentInput = z.infer<typeof saveEnrollmentSchema>;

export type SaveEnrollmentParseResult =
  | { ok: true; command: SaveEnrollmentInput }
  | { ok: false; error: string };

export function readSaveEnrollmentInput(
  formData: FormData
): SaveEnrollmentParseResult {
  const parsed = saveEnrollmentSchema.safeParse({
    id: formData.get("id") ?? "",
    student_id: formData.get("student_id") ?? "",
    academic_year_id: formData.get("academic_year_id") ?? "",
    class_id: formData.get("class_id") ?? "",
    enrollment_date: formData.get("enrollment_date") ?? "",
    exit_date: formData.get("exit_date") ?? "",
    status: formData.get("status") ?? "active",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}
