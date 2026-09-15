import { z } from "zod";
import { validatePassword } from "@/lib/password";

/**
 * Kontrak input untuk simpan user (buat & ubah).
 * Dipakai ulang oleh Server Action hari ini dan API backend/mobile nanti,
 * jadi jangan mengandung hal spesifik web seperti FormData di tipe ini.
 */
export const saveUserSchema = z
  .object({
    id: z.uuid().optional(),
    full_name: z.string().trim().min(2, "Nama minimal 2 karakter"),
    email: z.email("Format email tidak valid").optional(),
    password: z.string().optional(),
    phone: z.string().trim().optional(),
    jabatan: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password) {
      const problem = validatePassword(data.password);
      if (problem) {
        ctx.addIssue({ code: "custom", path: ["password"], message: problem });
      }
    }

    // User baru wajib punya kredensial awal (akun dibuat lewat Auth Admin API).
    if (!data.id && (!data.email || !data.password)) {
      ctx.addIssue({
        code: "custom",
        path: [data.email ? "password" : "email"],
        message: "Email dan password wajib diisi untuk user baru.",
      });
    }
  });

export type SaveUserInput = z.infer<typeof saveUserSchema>;

/** Perintah siap eksekusi yang diterima service (bebas dari FormData). */
export type SaveUserCommand = SaveUserInput & {
  is_active: boolean;
  role_ids: string[];
  roles_included: boolean;
  school_id: string;
  school_included: boolean;
};

export type SaveUserParseResult =
  | { ok: true; command: SaveUserCommand }
  | { ok: false; error: string };

function readRoleIds(formData: FormData): string[] {
  return formData
    .getAll("role_ids")
    .map((value) => String(value))
    .filter(Boolean);
}

/**
 * Baca + validasi FormData form user, lalu susun menjadi command.
 * Satu-satunya tempat yang tahu nama-nama field form user.
 */
export function readSaveUserInput(formData: FormData): SaveUserParseResult {
  const parsed = saveUserSchema.safeParse({
    id: formData.get("id") || undefined,
    full_name: formData.get("full_name"),
    email: formData.get("email") || undefined,
    password: formData.get("password") || undefined,
    phone: formData.get("phone") ?? "",
    jabatan: formData.get("jabatan") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  return {
    ok: true,
    command: {
      ...parsed.data,
      is_active: formData.get("is_active") === "true",
      role_ids: readRoleIds(formData),
      roles_included: formData.get("roles_included") === "true",
      school_id: String(formData.get("school_id") ?? "").trim(),
      school_included: formData.get("school_included") === "true",
    },
  };
}
