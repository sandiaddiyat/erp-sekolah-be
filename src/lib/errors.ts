/**
 * Log error asli di server dan kembalikan pesan aman untuk ditampilkan ke user.
 * Mencegah detail internal (skema/RLS/constraint) bocor ke UI.
 */
export function serverError(error: unknown, fallback: string): string {
  if (error) {
    console.error("[server-error]", error);
  }
  return fallback;
}
