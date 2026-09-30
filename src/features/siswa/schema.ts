import { z } from "zod";

/**
 * Kontrak input untuk simpan siswa (buat & ubah).
 * Satu-satunya tempat yang tahu nama-nama field form siswa.
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

export const saveSiswaSchema = z
  .object({
    id: optionalUuid,
    nama_lengkap: z.string().trim().min(2, "Nama siswa minimal 2 karakter"),
    nama_panggilan: optionalText(100, "Nama panggilan"),
    nis: optionalText(30, "NIS"),
    nisn: optionalText(30, "NISN"),
    jenis_kelamin: z
      .enum(["L", "P"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tempat_lahir: optionalText(100, "Tempat lahir"),
    tanggal_lahir: optionalDate,
    agama_id: optionalUuid,
    status_dalam_keluarga: optionalText(50, "Status dalam keluarga"),
    anak_ke: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : undefined))
      .refine((v) => !v || v > 0, "Anak ke harus angka positif"),
    alamat: optionalText(500, "Alamat"),
    alamat_dusun: optionalText(150, "Dusun"),
    alamat_rt: optionalText(10, "RT"),
    alamat_rw: optionalText(10, "RW"),
    alamat_desa: optionalText(150, "Desa"),
    alamat_kecamatan: optionalText(150, "Kecamatan"),
    alamat_kabupaten_kota: optionalText(150, "Kabupaten/Kota"),
    nama_ayah: optionalText(150, "Nama ayah"),
    pekerjaan_ayah: optionalText(150, "Pekerjaan ayah"),
    nama_ibu: optionalText(150, "Nama ibu"),
    pekerjaan_ibu: optionalText(150, "Pekerjaan ibu"),
    no_telp_rumah: optionalText(30, "Telepon rumah"),
    alamat_ortu_dusun: optionalText(150, "Dusun orang tua"),
    alamat_ortu_rt: optionalText(10, "RT orang tua"),
    alamat_ortu_rw: optionalText(10, "RW orang tua"),
    alamat_ortu_desa: optionalText(150, "Desa orang tua"),
    alamat_ortu_kecamatan: optionalText(150, "Kecamatan orang tua"),
    alamat_ortu_kabupaten_kota: optionalText(150, "Kabupaten/Kota orang tua"),
    nama_wali: optionalText(150, "Nama wali"),
    pekerjaan_wali: optionalText(150, "Pekerjaan wali"),
    no_telp_wali: optionalText(30, "Telepon wali"),
    alamat_wali_dusun: optionalText(150, "Dusun wali"),
    alamat_wali_rt: optionalText(10, "RT wali"),
    alamat_wali_rw: optionalText(10, "RW wali"),
    alamat_wali_desa: optionalText(150, "Desa wali"),
    photo_url: z
      .string()
      .trim()
      .url("URL foto tidak valid")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    status: z.enum(["aktif", "lulus", "pindah", "keluar"]).default("aktif"),
  })
  .superRefine((data, ctx) => {
    // Setidaknya salah satu nomor induk terisi agar data mudah dirujuk.
    if (!data.nis && !data.nisn) {
      ctx.addIssue({
        code: "custom",
        path: ["nis"],
        message: "Isi minimal salah satu: NIS, atau NISN.",
      });
    }
  });

export type SaveSiswaInput = z.infer<typeof saveSiswaSchema>;

export type SaveSiswaParseResult =
  | { ok: true; command: SaveSiswaInput }
  | { ok: false; error: string };

/**
 * Baca + validasi FormData form siswa, lalu susun menjadi command.
 */
export function readSaveSiswaInput(formData: FormData): SaveSiswaParseResult {
  const parsed = saveSiswaSchema.safeParse({
    id: formData.get("id") ?? "",
    nama_lengkap: formData.get("nama_lengkap"),
    nama_panggilan: formData.get("nama_panggilan") ?? "",
    nis: formData.get("nis") ?? "",
    nisn: formData.get("nisn") ?? "",
    jenis_kelamin: formData.get("jenis_kelamin") ?? "",
    tempat_lahir: formData.get("tempat_lahir") ?? "",
    tanggal_lahir: formData.get("tanggal_lahir") ?? "",
    agama_id: formData.get("agama_id") ?? "",
    status_dalam_keluarga: formData.get("status_dalam_keluarga") ?? "",
    anak_ke: formData.get("anak_ke") ?? "",
    alamat: formData.get("alamat") ?? "",
    alamat_dusun: formData.get("alamat_dusun") ?? "",
    alamat_rt: formData.get("alamat_rt") ?? "",
    alamat_rw: formData.get("alamat_rw") ?? "",
    alamat_desa: formData.get("alamat_desa") ?? "",
    alamat_kecamatan: formData.get("alamat_kecamatan") ?? "",
    alamat_kabupaten_kota: formData.get("alamat_kabupaten_kota") ?? "",
    nama_ayah: formData.get("nama_ayah") ?? "",
    pekerjaan_ayah: formData.get("pekerjaan_ayah") ?? "",
    nama_ibu: formData.get("nama_ibu") ?? "",
    pekerjaan_ibu: formData.get("pekerjaan_ibu") ?? "",
    no_telp_rumah: formData.get("no_telp_rumah") ?? "",
    alamat_ortu_dusun: formData.get("alamat_ortu_dusun") ?? "",
    alamat_ortu_rt: formData.get("alamat_ortu_rt") ?? "",
    alamat_ortu_rw: formData.get("alamat_ortu_rw") ?? "",
    alamat_ortu_desa: formData.get("alamat_ortu_desa") ?? "",
    alamat_ortu_kecamatan: formData.get("alamat_ortu_kecamatan") ?? "",
    alamat_ortu_kabupaten_kota: formData.get("alamat_ortu_kabupaten_kota") ?? "",
    nama_wali: formData.get("nama_wali") ?? "",
    pekerjaan_wali: formData.get("pekerjaan_wali") ?? "",
    no_telp_wali: formData.get("no_telp_wali") ?? "",
    alamat_wali_dusun: formData.get("alamat_wali_dusun") ?? "",
    alamat_wali_rt: formData.get("alamat_wali_rt") ?? "",
    alamat_wali_rw: formData.get("alamat_wali_rw") ?? "",
    alamat_wali_desa: formData.get("alamat_wali_desa") ?? "",
    photo_url: formData.get("photo_url") ?? "",
    status: formData.get("status") ?? "aktif",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return { ok: true, command: parsed.data };
}
