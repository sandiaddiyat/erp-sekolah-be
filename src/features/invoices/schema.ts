import { z } from "zod";

export const createManualInvoiceSchema = z
  .object({
    student_id: z.uuid("Pilih siswa yang valid"),
    academic_year_id: z.uuid("Pilih tahun ajaran yang valid"),
    fee_structure_id: z.union([z.uuid(), z.literal("")]).transform((value) => value || null),
    period_label: z.string().trim().min(3, "Deskripsi/periode minimal 3 karakter").max(200),
    nominal: z.coerce.number().positive("Nominal harus lebih dari 0"),
    diskon: z.coerce.number().min(0, "Diskon tidak boleh negatif"),
    jatuh_tempo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal jatuh tempo YYYY-MM-DD"),
  })
  .refine((input) => input.diskon <= input.nominal, {
    message: "Diskon tidak boleh melebihi nominal tagihan",
    path: ["diskon"],
  });

export type CreateManualInvoiceInput = z.infer<typeof createManualInvoiceSchema>;

export function readCreateManualInvoiceInput(formData: FormData) {
  return createManualInvoiceSchema.safeParse({
    student_id: formData.get("student_id"),
    academic_year_id: formData.get("academic_year_id"),
    fee_structure_id: formData.get("fee_structure_id") ?? "",
    period_label: formData.get("deskripsi") ?? formData.get("period_label"),
    nominal: String(formData.get("nominal") ?? "").replace(/[^\\d]/g, ""),
    diskon: String(formData.get("diskon") ?? "0").replace(/[^\\d]/g, "") || "0",
    jatuh_tempo: formData.get("jatuh_tempo"),
  });
}

export const updateInvoiceStatusSchema = z.object({
  id: z.string().trim().min(1, "Invoice wajib dipilih").refine((v) => z.uuid().safeParse(v).success, "Invoice tidak valid."),
  status: z.enum(["belum_bayar", "sebagian", "lunas", "batal"]),
});

export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;

export type UpdateInvoiceStatusParseResult =
  | { ok: true; command: UpdateInvoiceStatusInput }
  | { ok: false; error: string };

export function readUpdateInvoiceStatusInput(formData: FormData): UpdateInvoiceStatusParseResult {
  const parsed = updateInvoiceStatusSchema.safeParse({
    id: formData.get("id") ?? "",
    status: formData.get("status") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  return { ok: true, command: parsed.data };
}
