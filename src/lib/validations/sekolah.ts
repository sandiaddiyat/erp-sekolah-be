import { z } from "zod";

export const sekolahProfileSchema = z
  .object({
    id: z.string().uuid().optional(),
    npsn: z.string().trim().min(1, "NPSN wajib diisi").max(20),
    name: z.string().trim().min(1, "Nama sekolah wajib diisi").min(3, "Nama sekolah minimal 3 karakter"),
    nis_nss_nds: z.string().trim().optional().or(z.literal("")),
    alamat: z.string().trim().min(1, "Alamat wajib diisi"),
    kode_pos: z.string().trim().max(10).optional().or(z.literal("")),
    telepon: z.string().trim().max(20).optional().or(z.literal("")),
    kelurahan: z.string().trim().max(100).optional().or(z.literal("")),
    kecamatan: z.string().trim().max(100).optional().or(z.literal("")),
    kota: z.string().trim().max(100).optional().or(z.literal("")),
    provinsi: z.string().trim().max(100).optional().or(z.literal("")),
    website: z.string().trim().url("URL website tidak valid").optional().or(z.literal("")),
    email: z.string().trim().email("Format email tidak valid").optional().or(z.literal("")),
    dinas: z.string().trim().max(100).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const hasKota = (data.kota ?? "").trim().length > 0;
    const hasKec = (data.kecamatan ?? "").trim().length > 0;
    const hasKel = (data.kelurahan ?? "").trim().length > 0;
    const filled = [hasKota, hasKec, hasKel].filter(Boolean).length;

    if (filled === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["kota"],
        message: "Minimal diisi salah satu: Kota/Kabupaten, Kecamatan, atau Kelurahan/Desa.",
      });
    } else if (filled > 1) {
      ctx.addIssue({
        code: "custom",
        path: ["kota"],
        message: "Hanya boleh diisi salah satu: Kota/Kabupaten, Kecamatan, atau Kelurahan/Desa.",
      });
    }
  });

export type SekolahProfileInput = z.infer<typeof sekolahProfileSchema>;