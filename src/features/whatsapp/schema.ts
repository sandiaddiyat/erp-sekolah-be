import { z } from "zod";

const provider = z.enum(["fonnte", "wablas"]);
const optionalUuid = z.string().trim().optional().transform((value) => value || undefined).refine((value) => !value || z.uuid().safeParse(value).success, "ID tidak valid.");

export const saveWhatsAppSettingsSchema = z.object({
  provider,
  api_token: z.string().trim().min(1, "API token wajib diisi."),
  sender_number: z.string().trim().max(30).optional(),
  is_active: z.boolean(),
  auto_send_invoice: z.boolean(),
  auto_send_receipt: z.boolean(),
  template_invoice: z.string().trim().min(1, "Template tagihan wajib diisi.").max(2000),
  template_receipt: z.string().trim().min(1, "Template kuitansi wajib diisi.").max(2000),
});

export type SaveWhatsAppSettingsInput = z.infer<typeof saveWhatsAppSettingsSchema>;

export function readSaveWhatsAppSettingsInput(formData: FormData) {
  const parsed = saveWhatsAppSettingsSchema.safeParse({
    provider: formData.get("provider") ?? "",
    api_token: formData.get("api_token") ?? "",
    sender_number: formData.get("sender_number") ?? "",
    is_active: formData.get("is_active") === "true" || formData.get("is_active") === "on",
    auto_send_invoice: formData.get("auto_send_invoice") === "true" || formData.get("auto_send_invoice") === "on",
    auto_send_receipt: formData.get("auto_send_receipt") === "true" || formData.get("auto_send_receipt") === "on",
    template_invoice: formData.get("template_invoice") ?? "",
    template_receipt: formData.get("template_receipt") ?? "",
  });
  return parsed.success
    ? { ok: true as const, command: parsed.data }
    : { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
}

export const sendBulkInvoiceWASchema = z.object({
  invoice_ids: z.array(z.string().uuid("Tagihan tidak valid.")).min(1, "Pilih minimal satu tagihan."),
});

export function readSendBulkInvoiceWAInput(formData: FormData) {
  const parsed = sendBulkInvoiceWASchema.safeParse({ invoice_ids: formData.getAll("invoice_ids").map(String) });
  return parsed.success
    ? { ok: true as const, command: parsed.data }
    : { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
}

export function readSendTestWhatsAppInput(formData: FormData) {
  const parsed = z.object({ phone: z.string().trim().min(8, "Nomor penerima tidak valid.") }).safeParse({ phone: formData.get("phone") ?? "" });
  return parsed.success
    ? { ok: true as const, command: parsed.data }
    : { ok: false as const, error: parsed.error.issues[0]?.message ?? "Nomor tidak valid." };
}

export const optionalUuidSchema = optionalUuid;
