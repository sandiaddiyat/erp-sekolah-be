import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Belum dikonfigurasi: biarkan lewat, halaman akan menampilkan panduan setup.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  /*
   * getSession() dipakai (bukan getUser()) karena:
   *   - Tidak memanggil jaringan selama token masih berlaku -> hemat ~130ms
   *     per request, termasuk saat Next.js melakukan prefetch link.
   *   - Tetap otomatis me-refresh token yang kedaluwarsa dan menulis cookie
   *     barunya lewat setAll() di atas.
   *
   * Ini AMAN karena proxy hanya menentukan arah redirect, bukan memberi izin.
   * Otorisasi sesungguhnya terjadi di server component: getCurrentUser()
   * mengirim JWT user ke PostgREST, dan Supabase memverifikasi tanda tangan
   * serta masa berlaku token sebelum fungsi apa pun dieksekusi. Cookie palsu
   * akan ditolak di sana dan user diarahkan ke /login.
   */
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  const redirectTo = (path: string, search?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (search) {
      Object.entries(search).forEach(([key, value]) =>
        url.searchParams.set(key, value)
      );
    }
    const redirectResponse = NextResponse.redirect(url);
    response.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  };

  if (!session && !isPublicPath(pathname)) {
    return redirectTo("/login", { next: pathname });
  }

  if (session && (pathname === "/login" || pathname === "/")) {
    return redirectTo("/dashboard");
  }

  return response;
}
