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
    nis: optionalText(30, "NIS"),
    nisn: optionalText(30, "NISN"),
    jenis_kelamin: z
      .enum(["L", "P"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tempat_lahir: optionalText(100, "Tempat lahir"),
    tanggal_lahir: optionalDate,
    agama_id: optionalUuid,
    alamat: optionalText(500, "Alamat"),
    nama_ayah: optionalText(150, "Nama ayah"),
    nama_ibu: optionalText(150, "Nama ibu"),
    nama_wali: optionalText(150, "Nama wali"),
    telepon_wali: optionalText(30, "Telepon wali"),
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
    nis: formData.get("nis") ?? "",
    nisn: formData.get("nisn") ?? "",
    jenis_kelamin: formData.get("jenis_kelamin") ?? "",
    tempat_lahir: formData.get("tempat_lahir") ?? "",
    tanggal_lahir: formData.get("tanggal_lahir") ?? "",
    agama_id: formData.get("agama_id") ?? "",
    alamat: formData.get("alamat") ?? "",
    nama_ayah: formData.get("nama_ayah") ?? "",
    nama_ibu: formData.get("nama_ibu") ?? "",
    nama_wali: formData.get("nama_wali") ?? "",
    telepon_wali: formData.get("telepon_wali") ?? "",
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
