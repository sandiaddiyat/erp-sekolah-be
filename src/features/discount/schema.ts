import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || z.uuid().safeParse(v).success, "ID tidak valid.");

function readCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on" || value === "1";
}

// ===== Discount Types =====

export const saveDiscountTypeSchema = z.object({
  id: optionalUuid,
  code: z.string().trim().min(1, "Kode wajib diisi"),
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  calc_type: z.enum(["percent", "nominal"]),
  is_system: z.boolean().default(false),
});

export type SaveDiscountTypeInput = z.infer<typeof saveDiscountTypeSchema>;

export type SaveDiscountTypeParseResult =
  | { ok: true; command: SaveDiscountTypeInput }
  | { ok: false; error: string };

export function readSaveDiscountTypeInput(formData: FormData): SaveDiscountTypeParseResult {
  const parsed = saveDiscountTypeSchema.safeParse({
    id: formData.get("id") ?? "",
    code: formData.get("code") ?? "",
    name: formData.get("name") ?? "",
    calc_type: formData.get("calc_type") ?? "",
    is_system: readCheckbox(formData.get("is_system")),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

// ===== Student Discounts =====

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid.");

export const saveStudentDiscountSchema = z.object({
  id: optionalUuid,
  student_id: z.string().trim().min(1, "Siswa wajib dipilih"),
  discount_type_id: z.string().trim().min(1, "Jenis diskon wajib dipilih"),
  value: z
    .string()
    .trim()
    .min(1, "Nilai diskon wajib diisi")
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v >= 0, "Nilai tidak valid."),
  start_date: z.string().trim().min(1, "Tanggal mulai wajib diisi"),
  end_date: z.string().trim().min(1, "Tanggal selesai wajib diisi"),
  status: z.enum(["draft", "disetujui", "ditolak", "kadaluarsa"]).default("draft"),
});

export type SaveStudentDiscountInput = z.infer<typeof saveStudentDiscountSchema>;

export type SaveStudentDiscountParseResult =
  | { ok: true; command: SaveStudentDiscountInput }
  | { ok: false; error: string };

export function readSaveStudentDiscountInput(formData: FormData): SaveStudentDiscountParseResult {
  const parsed = saveStudentDiscountSchema.safeParse({
    id: formData.get("id") ?? "",
    student_id: formData.get("student_id") ?? "",
    discount_type_id: formData.get("discount_type_id") ?? "",
    value: formData.get("value") ?? "",
    start_date: formData.get("start_date") ?? "",
    end_date: formData.get("end_date") ?? "",
    status: formData.get("status") ?? "draft",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}
