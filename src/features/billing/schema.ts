import { z } from "zod";

/**
 * Kontrak input untuk job generate tagihan otomatis dan rekonsiliasi.
 */

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid.");

export const generateInvoicesSchema = z.object({
  academic_year_id: z
    .string()
    .trim()
    .min(1, "Tahun ajaran wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Tahun ajaran tidak valid."),
  period_label: z.string().trim().min(1, "Periode wajib diisi"),
  due_date: z
    .string()
    .trim()
    .min(1, "Tanggal jatuh tempo wajib diisi")
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid."),
  only_without_invoice: z
    .string()
    .trim()
    .optional()
    .transform((v) => v === "true" || v === "on" || v === "1"),
});

export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;

export type GenerateInvoicesParseResult =
  | { ok: true; command: GenerateInvoicesInput }
  | { ok: false; error: string };

export function readGenerateInvoicesInput(formData: FormData): GenerateInvoicesParseResult {
  const parsed = generateInvoicesSchema.safeParse({
    academic_year_id: formData.get("academic_year_id") ?? "",
    period_label: formData.get("period_label") ?? "",
    due_date: formData.get("due_date") ?? "",
    only_without_invoice: formData.get("only_without_invoice") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}
