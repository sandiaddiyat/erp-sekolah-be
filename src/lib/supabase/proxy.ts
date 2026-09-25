import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/auth"];

type AuthCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

type AuthHeaders = Record<string, string>;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function applyAuthResponse(
  response: NextResponse,
  cookies: Map<string, AuthCookie>,
  headers: AuthHeaders
) {
  for (const cookie of cookies.values()) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pendingCookies = new Map<string, AuthCookie>();
  const authHeaders: AuthHeaders = {};

  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.set(name, { name, value, options });
        });
        Object.assign(authHeaders, headers);

        response = NextResponse.next({ request });
        applyAuthResponse(response, pendingCookies, authHeaders);
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

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
    applyAuthResponse(redirectResponse, pendingCookies, authHeaders);
    return redirectResponse;
  };

  const isAuthenticated = !error && Boolean(user);

  if (!isAuthenticated && !isPublicPath(pathname)) {
    return redirectTo("/login", { next: pathname });
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
    return redirectTo("/dashboard");
  }

  return response;
}
