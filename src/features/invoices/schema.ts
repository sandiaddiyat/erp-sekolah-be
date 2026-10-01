import { z } from "zod";

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
