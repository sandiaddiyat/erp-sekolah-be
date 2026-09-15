import { z } from "zod";

/**
 * Kontrak input untuk simpan pegawai (buat & ubah).
 * Satu-satunya tempat yang tahu nama-nama field form pegawai.
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

export const savePegawaiSchema = z
  .object({
    id: optionalUuid,
    full_name: z.string().trim().min(2, "Nama pegawai minimal 2 karakter"),
    nip: optionalText(30, "NIP"),
    niy: optionalText(30, "NIY"),
    nuptk: optionalText(30, "NUPTK"),
    jenis_kelamin: z
      .enum(["L", "P"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tempat_lahir: optionalText(100, "Tempat lahir"),
    tanggal_lahir: optionalDate,
    agama_id: optionalUuid,
    status_kepegawaian_id: optionalUuid,
    jabatan_id: optionalUuid,
    golongan_id: optionalUuid,
    unit_kerja_id: optionalUuid,
    pendidikan_terakhir_id: optionalUuid,
    jurusan_id: optionalUuid,
    jenis_sertifikasi_id: optionalUuid,
    tahun_masuk: optionalDate,
    alamat: optionalText(500, "Alamat"),
    phone: optionalText(30, "Telepon"),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        "Format email tidak valid."
      ),
    bank_id: optionalUuid,
    no_rekening: optionalText(50, "Nomor rekening"),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    // Setidaknya salah satu nomor induk terisi agar data mudah dirujuk.
    if (!data.nip && !data.niy && !data.nuptk) {
      ctx.addIssue({
        code: "custom",
        path: ["nip"],
        message: "Isi minimal salah satu: NIP, NIY, atau NUPTK.",
      });
    }
  });

export type SavePegawaiInput = z.infer<typeof savePegawaiSchema>;

export type SavePegawaiParseResult =
  | { ok: true; command: SavePegawaiInput }
  | { ok: false; error: string };

/**
 * Baca + validasi FormData form pegawai, lalu susun menjadi command.
 */
export function readSavePegawaiInput(formData: FormData): SavePegawaiParseResult {
  const parsed = savePegawaiSchema.safeParse({
    id: formData.get("id") ?? "",
    full_name: formData.get("full_name"),
    nip: formData.get("nip") ?? "",
    niy: formData.get("niy") ?? "",
    nuptk: formData.get("nuptk") ?? "",
    jenis_kelamin: formData.get("jenis_kelamin") ?? "",
    tempat_lahir: formData.get("tempat_lahir") ?? "",
    tanggal_lahir: formData.get("tanggal_lahir") ?? "",
    agama_id: formData.get("agama_id") ?? "",
    status_kepegawaian_id: formData.get("status_kepegawaian_id") ?? "",
    jabatan_id: formData.get("jabatan_id") ?? "",
    golongan_id: formData.get("golongan_id") ?? "",
    unit_kerja_id: formData.get("unit_kerja_id") ?? "",
    pendidikan_terakhir_id: formData.get("pendidikan_terakhir_id") ?? "",
    jurusan_id: formData.get("jurusan_id") ?? "",
    jenis_sertifikasi_id: formData.get("jenis_sertifikasi_id") ?? "",
    tahun_masuk: formData.get("tahun_masuk") ?? "",
    alamat: formData.get("alamat") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    bank_id: formData.get("bank_id") ?? "",
    no_rekening: formData.get("no_rekening") ?? "",
    is_active: formData.get("is_active") !== "false",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}
