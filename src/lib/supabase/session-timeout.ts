import type { CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Batas maksimum usia cookie sesi: 7 hari (dalam detik). */
export const MAX_SESSION_COOKIE_AGE_SECONDS = 604800;

/** Batas inaktivitas: 24 jam (dalam milidetik). */
export const INACTIVITY_LIMIT_MS = 24 * 60 * 60 * 1000;

/**
 * Batas waktu absolut: 7 hari (dalam milidetik) sejak sesi
 * pertama kali dimulai, meskipun pengguna terus beraktivitas.
 */
export const ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;

/** Cookie pelacak waktu aktivitas terakhir (Unix timestamp dalam ms). */
export const LAST_ACTIVE_COOKIE = "erp_last_active";

/**
 * Cookie pelacak kapan sesi pertama kali dimulai. Tidak pernah
 * diperbarui selama sesi berjalan, sehingga batas 7 hari tetap
 * dihitung sejak login pertama.
 */
export const SESSION_START_COOKIE = "erp_session_start";

/**
 * Masa berlaku cookie `erp_session_start` (30 hari). Harus lebih
 * panjang dari `ABSOLUTE_TIMEOUT_MS` agar cookie tidak kedaluwarsa
 * tepat saat batas 7 hari seharusnya ditegakkan — kedaluwarsa
 * lebih awal akan me-reset window timeout secara diam-diam.
 */
const SESSION_START_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Membatasi masa berlaku cookie sesi maksimal 7 hari sejak cookie
 * disetel. Cookie penghapusan (`maxAge: 0`) dan cookie tanpa `maxAge`
 * (session cookie) dibiarkan agar perilaku bawaan Supabase tetap
 * berjalan — terutama penghapusan cookie saat sign-out.
 */
export function withSessionCookieLimit(options: CookieOptions): CookieOptions {
  return {
    ...options,
    maxAge:
      options.maxAge !== undefined && options.maxAge > 0
        ? Math.min(options.maxAge, MAX_SESSION_COOKIE_AGE_SECONDS)
        : options.maxAge,
  };
}

/** Opsi cookie pelacak aktivitas terakhir (diperbarui setiap request). */
export function createLastActiveCookieOptions(): CookieOptions {
  return {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: MAX_SESSION_COOKIE_AGE_SECONDS,
  };
}

/** Opsi cookie pelacak awal sesi (disetel sekali saat sesi dimulai). */
export function createSessionStartCookieOptions(): CookieOptions {
  return {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: SESSION_START_COOKIE_MAX_AGE_SECONDS,
  };
}

/**
 * Menghapus cookie sesi Supabase (`sb-*`) langsung dari response.
 * Dipakai sebagai fallback bila `auth.signOut()` gagal dipanggil
 * dari middleware, agar logout paksa tetap berjalan.
 */
export function clearSupabaseSessionCookies(
  request: NextRequest,
  response: NextResponse
): void {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-")) {
      response.cookies.delete(name);
    }
  }
}
