import { z } from "zod";

/**
 * Kontrak input untuk simpan role.
 * Dipakai ulang oleh Server Action hari ini dan API backend/mobile nanti,
 * jadi jangan mengandung hal spesifik web seperti FormData di tipe ini.
 */
export const saveRoleSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Nama role minimal 2 karakter"),
  description: z.string().trim().optional(),
});

export type SaveRoleInput = z.infer<typeof saveRoleSchema>;

/** Perintah siap eksekusi yang diterima service (bebas dari FormData). */
export type SaveRoleCommand = SaveRoleInput & {
  /** Daftar ID permission yang dipilih untuk role ini. */
  permission_ids: string[];
};

export type SaveRoleParseResult =
  | { ok: true; command: SaveRoleCommand }
  | { ok: false; error: string };

/**
 * Baca + validasi FormData form role, lalu susun menjadi command.
 * Satu-satunya tempat yang tahu nama-nama field form role.
 */
export function readSaveRoleInput(formData: FormData): SaveRoleParseResult {
  const parsed = saveRoleSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const permission_ids = formData
    .getAll("permission_ids")
    .map((value) => String(value))
    .filter(Boolean);

  return {
    ok: true,
    command: {
      ...parsed.data,
      permission_ids,
    },
  };
}
