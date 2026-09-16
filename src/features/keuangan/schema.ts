import { z } from "zod";

/**
 * Kontrak input untuk tagihan dan pembayaran.
 * Satu-satunya tempat yang tahu nama-nama field form keuangan.
 */

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || z.uuid().safeParse(v).success, "ID referensi tidak valid.");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined)
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid.");

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter`)
    .optional()
    .transform((v) => v || undefined);

/** Nominal dari FormData (string) menjadi angka > 0. */
const nominal = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .transform((v) => v.replace(/[^\d]/g, ""))
    .refine((v) => v.length > 0, `${label} harus berupa angka`)
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v > 0, `${label} harus lebih dari 0`);

export const saveBillSchema = z.object({
  student_id: z
    .string()
    .trim()
    .min(1, "Pilih siswa terlebih dahulu")
    .refine((v) => z.uuid().safeParse(v).success, "Siswa tidak valid."),
  bill_item_id: optionalUuid,
  deskripsi: z.string().trim().min(3, "Deskripsi minimal 3 karakter"),
  nominal: nominal("Nominal"),
  jatuh_tempo: optionalDate,
});

export type SaveBillInput = z.infer<typeof saveBillSchema>;

export type SaveBillParseResult =
  | { ok: true; command: SaveBillInput }
  | { ok: false; error: string };

export function readSaveBillInput(formData: FormData): SaveBillParseResult {
  const parsed = saveBillSchema.safeParse({
    student_id: formData.get("student_id") ?? "",
    bill_item_id: formData.get("bill_item_id") ?? "",
    deskripsi: formData.get("deskripsi") ?? "",
    nominal: formData.get("nominal") ?? "",
    jatuh_tempo: formData.get("jatuh_tempo") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

export const savePaymentSchema = z.object({
  bill_id: z
    .string()
    .trim()
    .min(1, "Tagihan tidak valid.")
    .refine((v) => z.uuid().safeParse(v).success, "Tagihan tidak valid."),
  nominal: nominal("Nominal"),
  metode: z.enum(["transfer", "tunai", "qris"], "Pilih metode pembayaran."),
  bukti_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined)
    .refine(
      (v) => !v || /^https?:\/\/.+/.test(v),
      "URL bukti harus dimulai dengan http:// atau https://"
    ),
  catatan: optionalText(500, "Catatan"),
});

export type SavePaymentInput = z.infer<typeof savePaymentSchema>;

export type SavePaymentParseResult =
  | { ok: true; command: SavePaymentInput }
  | { ok: false; error: string };

export function readSavePaymentInput(formData: FormData): SavePaymentParseResult {
  const parsed = savePaymentSchema.safeParse({
    bill_id: formData.get("bill_id") ?? "",
    nominal: formData.get("nominal") ?? "",
    metode: formData.get("metode") ?? "",
    bukti_url: formData.get("bukti_url") ?? "",
    catatan: formData.get("catatan") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

export const verifyPaymentSchema = z.object({
  payment_id: z
    .string()
    .trim()
    .min(1, "Pembayaran tidak valid.")
    .refine((v) => z.uuid().safeParse(v).success, "Pembayaran tidak valid."),
  keputusan: z.enum(["terverifikasi", "ditolak"], "Keputusan tidak valid."),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export type VerifyPaymentParseResult =
  | { ok: true; command: VerifyPaymentInput }
  | { ok: false; error: string };

export function readVerifyPaymentInput(
  formData: FormData
): VerifyPaymentParseResult {
  const parsed = verifyPaymentSchema.safeParse({
    payment_id: formData.get("payment_id") ?? "",
    keputusan: formData.get("keputusan") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}

export const saveBillItemSchema = z.object({
  id: optionalUuid,
  nama_item: z.string().trim().min(3, "Nama jenis tagihan minimal 3 karakter"),
  nominal: nominal("Nominal"),
  frekuensi: z.enum(["sekali", "bulanan", "tahunan"], "Pilih frekuensi."),
});

export type SaveBillItemInput = z.infer<typeof saveBillItemSchema>;

export type SaveBillItemParseResult =
  | { ok: true; command: SaveBillItemInput }
  | { ok: false; error: string };

export function readSaveBillItemInput(
  formData: FormData
): SaveBillItemParseResult {
  const parsed = saveBillItemSchema.safeParse({
    id: formData.get("id") ?? "",
    nama_item: formData.get("nama_item") ?? "",
    nominal: formData.get("nominal") ?? "",
    frekuensi: formData.get("frekuensi") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}
