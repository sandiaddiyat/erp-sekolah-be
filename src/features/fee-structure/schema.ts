import { z } from "zod";

/**
 * Kontrak input untuk skema biaya (fee structures & fee categories).
 */

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || z.uuid().safeParse(v).success, "ID tidak valid.");

function readCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on" || value === "1";
}

// ===== Fee Categories =====

export const saveFeeCategorySchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(3, "Nama kategori biaya minimal 3 karakter"),
  billing_cycle: z.enum(["bulanan", "semester", "tahunan", "sekali"], "Pilih frekuensi tagih."),
  description: z.string().trim().optional().transform((v) => v || undefined),
});

export type SaveFeeCategoryInput = z.infer<typeof saveFeeCategorySchema>;

export type SaveFeeCategoryParseResult =
  | { ok: true; command: SaveFeeCategoryInput }
  | { ok: false; error: string };

export function readSaveFeeCategoryInput(formData: FormData): SaveFeeCategoryParseResult {
  const parsed = saveFeeCategorySchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    billing_cycle: formData.get("billing_cycle") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

// ===== Fee Structures =====

export const saveFeeStructureSchema = z.object({
  id: optionalUuid,
  academic_year_id: z
    .string()
    .trim()
    .min(1, "Tahun ajaran wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Tahun ajaran tidak valid."),
  education_level_id: z
    .string()
    .trim()
    .min(1, "Jenjang wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Jenjang tidak valid."),
  grade_id: z
    .string()
    .trim()
    .min(1, "Tingkat wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Tingkat tidak valid."),
  major_id: optionalUuid,
  fee_category_id: z
    .string()
    .trim()
    .min(1, "Kategori biaya wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Kategori biaya tidak valid."),
  amount: z
    .string()
    .trim()
    .min(1, "Nominal wajib diisi")
    .transform((v) => v.replace(/[^\d]/g, ""))
    .refine((v) => v.length > 0, "Nominal harus berupa angka")
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, "Nominal harus lebih dari 0"),
  due_day: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && /^\d+$/.test(v) ? Number(v) : null)),
});

export type SaveFeeStructureInput = z.infer<typeof saveFeeStructureSchema>;

export type SaveFeeStructureParseResult =
  | { ok: true; command: SaveFeeStructureInput }
  | { ok: false; error: string };

export function readSaveFeeStructureInput(formData: FormData): SaveFeeStructureParseResult {
  const parsed = saveFeeStructureSchema.safeParse({
    id: formData.get("id") ?? "",
    academic_year_id: formData.get("academic_year_id") ?? "",
    education_level_id: formData.get("education_level_id") ?? "",
    grade_id: formData.get("grade_id") ?? "",
    major_id: formData.get("major_id") ?? "",
    fee_category_id: formData.get("fee_category_id") ?? "",
    amount: formData.get("amount") ?? "",
    due_day: formData.get("due_day") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}
