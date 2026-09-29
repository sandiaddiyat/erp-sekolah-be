import { z } from "zod";
import { validatePassword } from "@/lib/password";

export const saveSchoolSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(3, "Nama sekolah minimal 3 karakter"),
    slug: z.string().trim().optional(),
    npsn: z.string().trim().optional(),
    level: z.string().trim().optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z.string().trim().optional(),
    status: z.enum(["trial", "active", "suspended"]),
    active_until: z
      .string()
      .trim()
      .optional()
      .refine(
        (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v),
        "Format tanggal masa aktif tidak valid."
      ),
    notes: z.string().trim().optional(),
    create_admin: z.boolean().default(false),
    admin_name: z.string().trim().optional(),
    admin_email: z.string().trim().optional(),
    admin_password: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Format email tidak valid.",
      });
    }
    if (data.create_admin) {
      if ((data.admin_name ?? "").length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["admin_name"],
          message: "Nama admin minimal 2 karakter.",
        });
      }
      if (!data.admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.admin_email)) {
        ctx.addIssue({
          code: "custom",
          path: ["admin_email"],
          message: "Email admin tidak valid.",
        });
      }
      if (data.admin_password) {
        const problem = validatePassword(data.admin_password);
        if (problem) {
          ctx.addIssue({ code: "custom", path: ["admin_password"], message: problem });
        }
      } else {
        ctx.addIssue({
          code: "custom",
          path: ["admin_password"],
          message: "Password wajib diisi untuk admin baru.",
        });
      }
    }
  });

export type SaveSchoolInput = z.infer<typeof saveSchoolSchema>;

export type SaveSchoolCommand = Omit<SaveSchoolInput, "active_until" | "email"> & {
  email: string | null;
  active_until: string | null;
};

export type SaveSchoolParseResult =
  | { ok: true; command: SaveSchoolCommand }
  | { ok: false; error: string };

export function readSaveSchoolInput(formData: FormData): SaveSchoolParseResult {
  const parsed = saveSchoolSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    slug: formData.get("slug") ?? "",
    npsn: formData.get("npsn") ?? "",
    level: formData.get("level") ?? "",
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    status: formData.get("status") ?? "trial",
    active_until: formData.get("active_until") ?? "",
    notes: formData.get("notes") ?? "",
    create_admin: formData.get("create_admin") === "true",
    admin_name: formData.get("admin_name") ?? "",
    admin_email: formData.get("admin_email") ?? "",
    admin_password: formData.get("admin_password") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const { email, active_until, ...rest } = parsed.data;

  return {
    ok: true,
    command: {
      ...rest,
      email: email || null,
      active_until: active_until || null,
    },
  };
}

// ============================
// School profile form schema
// ============================

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

export type SaveSchoolProfileCommand = {
  id?: string;
  npsn: string;
  name: string;
  nis_nss_nds: string;
  alamat: string;
  kode_pos: string;
  telepon: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  website: string;
  email: string;
  dinas: string;
};

export type SaveSchoolProfileParseResult =
  | { ok: true; command: SaveSchoolProfileCommand }
  | { ok: false; error: string };

export function readSaveSchoolProfileInput(
  input: SekolahProfileInput
): SaveSchoolProfileParseResult {
  const hasKota = (input.kota ?? "").trim().length > 0;
  const hasKec = (input.kecamatan ?? "").trim().length > 0;
  const hasKel = (input.kelurahan ?? "").trim().length > 0;
  const filled = [hasKota, hasKec, hasKel].filter(Boolean).length;

  if (filled === 0) {
    return {
      ok: false,
      error: "Minimal diisi salah satu: Kota/Kabupaten, Kecamatan, atau Kelurahan/Desa.",
    };
  }
  if (filled > 1) {
    return {
      ok: false,
      error: "Hanya boleh diisi salah satu: Kota/Kabupaten, Kecamatan, atau Kelurahan/Desa.",
    };
  }

  return {
    ok: true,
    command: {
      id: input.id,
      npsn: input.npsn || "",
      name: input.name,
      nis_nss_nds: input.nis_nss_nds || "",
      alamat: input.alamat,
      kode_pos: input.kode_pos || "",
      telepon: input.telepon || "",
      kelurahan: input.kelurahan || "",
      kecamatan: input.kecamatan || "",
      kota: input.kota || "",
      provinsi: input.provinsi || "",
      website: input.website || "",
      email: input.email || "",
      dinas: input.dinas || "",
    },
  };
}