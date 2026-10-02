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
  fee_category_ids: z
    .array(z.string())
    .min(1, "Pilih minimal satu komponen biaya"),
});

export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;

export type GenerateInvoicesParseResult =
  | { ok: true; command: GenerateInvoicesInput }
  | { ok: false; error: string };

export function readGenerateInvoicesInput(formData: FormData): GenerateInvoicesParseResult {
  const getVal = (key: string) => {
    return (formData.get(key) ?? formData.get(`_1_${key}`) ?? "").toString().trim();
  };

  const parsed = generateInvoicesSchema.safeParse({
    academic_year_id: getVal("academic_year_id"),
    period_label: getVal("period_label"),
    due_date: getVal("due_date"),
    only_without_invoice: getVal("only_without_invoice"),
    fee_category_ids: formData.getAll("fee_category_ids").length > 0 
      ? formData.getAll("fee_category_ids")
      : formData.getAll("_1_fee_category_ids"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

export const deleteInvoiceSchema = z.object({
  id: z.string().trim().min(1, "ID tagihan wajib diisi"),
});

export const bulkDeleteInvoiceSchema = z.object({
  ids: z.array(z.string()).min(1, "Minimal pilih satu tagihan untuk dihapus"),
});

export type DeleteInvoiceInput = z.infer<typeof deleteInvoiceSchema>;
export type BulkDeleteInvoiceInput = z.infer<typeof bulkDeleteInvoiceSchema>;

export type DeleteInvoiceParseResult =
  | { ok: true; command: DeleteInvoiceInput }
  | { ok: false; error: string };

export type BulkDeleteInvoiceParseResult =
  | { ok: true; command: BulkDeleteInvoiceInput }
  | { ok: false; error: string };

export function readDeleteInvoiceInput(formData: FormData): DeleteInvoiceParseResult {
  const getVal = (key: string) => {
    return (formData.get(key) ?? formData.get(`_1_${key}`) ?? "").toString().trim();
  };

  const parsed = deleteInvoiceSchema.safeParse({
    id: getVal("id"),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

export function readBulkDeleteInvoiceInput(formData: FormData): BulkDeleteInvoiceParseResult {
  const ids = formData.getAll("ids").length > 0 ? formData.getAll("ids") : formData.getAll("_1_ids");
  const parsed = bulkDeleteInvoiceSchema.safeParse({
    ids: ids.map(id => id.toString()),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Pilih minimal satu tagihan." };
  }

  return { ok: true, command: parsed.data };
}
