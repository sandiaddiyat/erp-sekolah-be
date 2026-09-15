import { accessBlocked, getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import type { CurrentUser } from "@/lib/types";

export type ActionGuard = { user: CurrentUser } | { error: string };

/**
 * Guard tunggal untuk semua Server Action, menggantikan boilerplate berulang:
 *   1. sesi masih valid (login),
 *   2. akun tidak diblokir (nonaktif/suspend/masa aktif habis),
 *   3. (opsional) punya permission yang diminta.
 *
 * Mengembalikan `{ user }` bila lolos, atau `{ error }` dengan pesan siap
 * tampilkan. Guard ini pelengkap — penegakan utama tetap di RLS.
 */
export async function guardAction(
  options: { permission?: string; deniedMessage?: string } = {}
): Promise<ActionGuard> {
  const current = await getCurrentUser();
  if (!current) {
    return { error: "Sesi Anda berakhir. Silakan login ulang." };
  }

  const blocked = accessBlocked(current);
  if (blocked) return { error: blocked };

  if (
    options.permission &&
    !can(current.permissions, options.permission, current.isSuperAdmin)
  ) {
    return {
      error: options.deniedMessage ?? "Anda tidak punya izin melakukan aksi ini.",
    };
  }

  return { user: current };
}
