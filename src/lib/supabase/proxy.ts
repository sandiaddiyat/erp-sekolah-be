import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";
import {
  ABSOLUTE_TIMEOUT_MS,
  clearSupabaseSessionCookies,
  createLastActiveCookieOptions,
  createSessionStartCookieOptions,
  INACTIVITY_LIMIT_MS,
  LAST_ACTIVE_COOKIE,
  SESSION_START_COOKIE,
  withSessionCookieLimit,
} from "@/lib/supabase/session-timeout";

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

function readTimestampCookie(
  request: NextRequest,
  name: string
): number | undefined {
  const raw = request.cookies.get(name)?.value;
  if (!raw) return undefined;

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
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
          pendingCookies.set(name, {
            name,
            value,
            options: withSessionCookieLimit(options),
          });
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

  const forceSignOut = async (reason: "inactivity" | "expired") => {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error("[session-timeout]", signOutError);
    }

    const redirectResponse = redirectTo("/login", { reason });
    clearSupabaseSessionCookies(request, redirectResponse);
    redirectResponse.cookies.delete(LAST_ACTIVE_COOKIE);
    redirectResponse.cookies.delete(SESSION_START_COOKIE);
    return redirectResponse;
  };

  const isAuthenticated = !error && Boolean(user);

  if (isAuthenticated) {
    const lastActiveAt = readTimestampCookie(request, LAST_ACTIVE_COOKIE);
    const sessionStartAt = readTimestampCookie(request, SESSION_START_COOKIE);
    const now = Date.now();

    if (lastActiveAt !== undefined && now - lastActiveAt > INACTIVITY_LIMIT_MS) {
      return forceSignOut("inactivity");
    }

    if (sessionStartAt !== undefined && now - sessionStartAt > ABSOLUTE_TIMEOUT_MS) {
      return forceSignOut("expired");
    }

    pendingCookies.set(LAST_ACTIVE_COOKIE, {
      name: LAST_ACTIVE_COOKIE,
      value: String(now),
      options: createLastActiveCookieOptions(),
    });

    if (sessionStartAt === undefined) {
      pendingCookies.set(SESSION_START_COOKIE, {
        name: SESSION_START_COOKIE,
        value: String(now),
        options: createSessionStartCookieOptions(),
      });
    }
  }

  if (!isAuthenticated && !isPublicPath(pathname)) {
    return redirectTo("/login", { next: pathname });
  }

  if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
    return redirectTo("/dashboard");
  }

  applyAuthResponse(response, pendingCookies, authHeaders);
  return response;
}
