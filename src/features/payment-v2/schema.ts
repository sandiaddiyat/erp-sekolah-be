import { z } from "zod";

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || z.uuid().safeParse(v).success, "ID tidak valid.");

// ===== Payment Methods =====

export const savePaymentMethodSchema = z.object({
  id: optionalUuid,
  name: z.string().trim().min(2, "Nama metode minimal 2 karakter"),
  is_cash: z.boolean().default(false),
  is_gateway: z.boolean().default(false),
});

export type SavePaymentMethodInput = z.infer<typeof savePaymentMethodSchema>;

export type SavePaymentMethodParseResult =
  | { ok: true; command: SavePaymentMethodInput }
  | { ok: false; error: string };

export function readSavePaymentMethodInput(formData: FormData): SavePaymentMethodParseResult {
  const parsed = savePaymentMethodSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    is_cash: formData.get("is_cash") === "true" || formData.get("is_cash") === "on",
    is_gateway: formData.get("is_gateway") === "true" || formData.get("is_gateway") === "on",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

// ===== Bank Accounts =====

export const saveBankAccountSchema = z.object({
  id: optionalUuid,
  bank_name: z.string().trim().min(2, "Nama bank minimal 2 karakter"),
  account_number: z.string().trim().min(5, "Nomor rekening tidak valid"),
  account_holder: z.string().trim().min(2, "Nama pemilik minimal 2 karakter"),
});

export type SaveBankAccountInput = z.infer<typeof saveBankAccountSchema>;

export type SaveBankAccountParseResult =
  | { ok: true; command: SaveBankAccountInput }
  | { ok: false; error: string };

export function readSaveBankAccountInput(formData: FormData): SaveBankAccountParseResult {
  const parsed = saveBankAccountSchema.safeParse({
    id: formData.get("id") ?? "",
    bank_name: formData.get("bank_name") ?? "",
    account_number: formData.get("account_number") ?? "",
    account_holder: formData.get("account_holder") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

// ===== Reconciliation =====

const nominal = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .transform((v) => v.replace(/[^\d]/g, ""))
    .refine((v) => v.length > 0, `${label} harus berupa angka`)
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, `${label} harus lebih dari 0`);

export const recordPaymentSchema = z.object({
  invoice_id: z
    .string()
    .trim()
    .min(1, "Tagihan tidak valid.")
    .refine((v) => z.uuid().safeParse(v).success, "Tagihan tidak valid."),
  payment_method_id: z
    .string()
    .trim()
    .min(1, "Metode pembayaran wajib dipilih")
    .refine((v) => z.uuid().safeParse(v).success, "Metode tidak valid."),
  nominal: nominal("Nominal"),
  catatan: z
    .string()
    .trim()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .transform((v) => v || undefined),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export type RecordPaymentParseResult =
  | { ok: true; command: RecordPaymentInput }
  | { ok: false; error: string };

export function readRecordPaymentInput(formData: FormData): RecordPaymentParseResult {
  const parsed = recordPaymentSchema.safeParse({
    invoice_id: formData.get("invoice_id") ?? "",
    payment_method_id: formData.get("payment_method_id") ?? "",
    nominal: formData.get("nominal") ?? "",
    catatan: formData.get("catatan") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  return { ok: true, command: parsed.data };
}
