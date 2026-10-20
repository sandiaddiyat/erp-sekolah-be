import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional();

export const saveTelegramSettingsSchema = z.object({
  bot_token: z.string().trim().max(200),
  bot_username: optionalText(100),
  is_active: z.boolean(),
  auto_send_invoice: z.boolean(),
  auto_send_receipt: z.boolean(),
  template_invoice: z.string().trim().min(1, "Template tagihan wajib diisi.").max(2000),
  template_receipt: z.string().trim().min(1, "Template kuitansi wajib diisi.").max(2000),
});

export type SaveTelegramSettingsInput = z.infer<typeof saveTelegramSettingsSchema>;

export function readSaveTelegramSettingsInput(formData: FormData) {
  const parsed = saveTelegramSettingsSchema.safeParse({
    bot_token: formData.get("bot_token") ?? "",
    bot_username: formData.get("bot_username") ?? "",
    is_active: formData.get("is_active") === "true" || formData.get("is_active") === "on",
    auto_send_invoice: formData.get("auto_send_invoice") === "true" || formData.get("auto_send_invoice") === "on",
    auto_send_receipt: formData.get("auto_send_receipt") === "true" || formData.get("auto_send_receipt") === "on",
    template_invoice: formData.get("template_invoice") ?? "",
    template_receipt: formData.get("template_receipt") ?? "",
  });
  return parsed.success ? { ok: true as const, command: parsed.data } : { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
}

export function readSendTestTelegramInput(formData: FormData) {
  const parsed = z.object({ chat_id: z.string().trim().min(3, "Chat ID tidak valid.") }).safeParse({ chat_id: formData.get("chat_id") ?? "" });
  return parsed.success ? { ok: true as const, command: parsed.data } : { ok: false as const, error: parsed.error.issues[0]?.message ?? "Chat ID tidak valid." };
}

export function readSendBulkInvoiceTelegramInput(formData: FormData) {
  const parsed = z.object({ invoice_ids: z.array(z.string().uuid("Tagihan tidak valid.")).min(1, "Pilih minimal satu tagihan.") }).safeParse({ invoice_ids: formData.getAll("invoice_ids").map(String) });
  return parsed.success ? { ok: true as const, command: parsed.data } : { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
}
