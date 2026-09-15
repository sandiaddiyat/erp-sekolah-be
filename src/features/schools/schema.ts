import { z } from "zod";
import { validatePassword } from "@/lib/password";
import type { SchoolStatus } from "@/lib/types";

/**
 * Kontrak input untuk simpan sekolah (buat & ubah).
 * Dipakai ulang oleh Server Action hari ini dan API backend/mobile nanti,
 * jadi jangan mengandung hal spesifik web seperti FormData di tipe ini.
 */
export const saveSchoolSchema = z
  .object({
    id: z.uuid().optional(),
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
    // Email sekolah wajib valid bila diisi.
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Format email tidak valid." });
    }

    // Jika memilih buat admin, semua field admin wajib valid.
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

/** Perintah siap eksekusi yang diterima service (bebas dari FormData). */
export type SaveSchoolCommand = Omit<SaveSchoolInput, "active_until" | "email"> & {
  email: string | null;
  active_until: string | null;
};

export type SaveSchoolParseResult =
  | { ok: true; command: SaveSchoolCommand }
  | { ok: false; error: string };

/**
 * Baca + validasi FormData form sekolah, lalu susun menjadi command.
 * Satu-satunya tempat yang tahu nama-nama field form sekolah.
 */
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

export type { SchoolStatus };
