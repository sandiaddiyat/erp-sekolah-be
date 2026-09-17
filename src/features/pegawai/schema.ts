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

export const pendidikanRowSchema = z.object({
  jenjang_pendidikan_id: optionalUuid,
  jurusan: optionalText(150, "Jurusan"),
  nama_institusi: optionalText(150, "Nama institusi"),
  tahun_lulus: optionalText(4, "Tahun lulus").refine(
    (v) => !v || /^\d{4}$/.test(v),
    "Tahun lulus harus 4 digit."
  ),
});

export const sertifikasiRowSchema = z.object({
  nama_sertifikasi: z
    .string({ error: "Nama sertifikasi wajib diisi." })
    .trim()
    .min(1, "Nama sertifikasi wajib diisi."),
  tanggal_berlaku: optionalDate,
  tanggal_kedaluwarsa: optionalDate,
  nomor_sertifikat: optionalText(100, "Nomor sertifikat"),
  penerbit: optionalText(150, "Penerbit"),
});

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
    jabatan_ids: z
      .array(z.string().uuid("ID referensi tidak valid."))
      .max(10, "Maksimal 10 jabatan")
      .default([]),
    jabatan_utama_id: optionalUuid,
    golongan_id: optionalUuid,
    unit_kerja_id: optionalUuid,
    tahun_masuk: optionalDate,
    pendidikan: z.array(pendidikanRowSchema).max(20).default([]),
    sertifikasi: z.array(sertifikasiRowSchema).max(30).default([]),
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
    // Bila ada jabatan dipilih, jabatan utama wajib dan harus anggota daftar.
    if (data.jabatan_ids.length > 0) {
      if (!data.jabatan_utama_id) {
        ctx.addIssue({
          code: "custom",
          path: ["jabatan_utama_id"],
          message: "Pilih jabatan utama dari daftar jabatan yang dipilih.",
        });
      } else if (!data.jabatan_ids.includes(data.jabatan_utama_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["jabatan_utama_id"],
          message: "Pilih jabatan utama dari daftar jabatan yang dipilih.",
        });
      }
    }
  });

export type SavePegawaiInput = z.infer<typeof savePegawaiSchema>;

export type SavePegawaiParseResult =
  | { ok: true; command: SavePegawaiInput }
  | { ok: false; error: string };

/** Baca array baris (pendidikan/sertifikasi) dari hidden input JSON FormData. */
function readJsonArray(formData: FormData, key: string): unknown[] {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Baca + validasi FormData form pegawai, lalu susun menjadi command.
 * Array pendidikan & sertifikasi dikirim sebagai JSON string lewat hidden input.
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
    jabatan_ids: formData.getAll("jabatan_ids").map(String).filter(Boolean),
    jabatan_utama_id: formData.get("jabatan_utama_id") ?? "",
    golongan_id: formData.get("golongan_id") ?? "",
    unit_kerja_id: formData.get("unit_kerja_id") ?? "",
    tahun_masuk: formData.get("tahun_masuk") ?? "",
    pendidikan: readJsonArray(formData, "pendidikan"),
    sertifikasi: readJsonArray(formData, "sertifikasi"),
    alamat: formData.get("alamat") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
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
