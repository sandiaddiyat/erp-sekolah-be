// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { config } from "@/proxy";
import { updateSession } from "@/lib/supabase/proxy";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

vi.mock("@/lib/env", () => ({
  SUPABASE_URL: "https://project.test",
  SUPABASE_ANON_KEY: "anon-key",
  isSupabaseConfigured: () => true,
}));

type TestUser = { id: string };
type TestError = { message: string };
type TestCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};
type TestCookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: TestCookie[],
    headers: Record<string, string>
  ) => void;
};

let getUser: ReturnType<typeof vi.fn>;
let signOut: ReturnType<typeof vi.fn>;
let cookieAdapter: TestCookieAdapter;

function setAuthResult(
  user: TestUser | null,
  error: TestError | null = null,
  onGetUser?: () => void
) {
  getUser.mockImplementation(async () => {
    onGetUser?.();
    return { data: { user }, error };
  });
}

function refreshSession(
  options: Record<string, unknown> = {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
  }
) {
  cookieAdapter.setAll(
    [
      {
        name: "sb-auth-token",
        value: "refreshed-token",
        options,
      },
    ],
    {
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Expires: "0",
      Pragma: "no-cache",
    }
  );
}

beforeEach(() => {
  getUser = vi.fn();
  signOut = vi.fn().mockResolvedValue({ error: null });
  cookieAdapter = {
    getAll: vi.fn(() => []),
    setAll: vi.fn(),
  };
  mocks.createServerClient.mockReset();
  mocks.createServerClient.mockImplementation((_url, _key, options) => {
    cookieAdapter = options.cookies as TestCookieAdapter;
    return { auth: { getUser, signOut } };
  });
});

describe("updateSession", () => {
  it("membiarkan halaman login tanpa user tetap terbuka", async () => {
    setAuthResult(null);
    const request = new NextRequest("https://app.test/login");

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("mengalihkan route terproteksi tanpa user ke login", async () => {
    setAuthResult(null);
    const request = new NextRequest("https://app.test/dashboard");

    const response = await updateSession(request);
    const location = new URL(getRedirectUrl(response) ?? "");

    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/dashboard");
  });

  it("meneruskan request terproteksi untuk user yang valid", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("mengalihkan user yang valid dari login atau root ke dashboard", async () => {
    setAuthResult({ id: "user-1" });

    for (const path of ["/login", "/"]) {
      const request = new NextRequest(`https://app.test${path}`);
      const response = await updateSession(request);
      const location = new URL(getRedirectUrl(response) ?? "");

      expect(location.pathname).toBe("/dashboard");
    }
  });

  it("menjaga callback auth tetap public untuk user yang valid", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/auth/callback");

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
  });

  it("memperlakukan error validasi sebagai unauthenticated", async () => {
    setAuthResult(null, { message: "token invalid" });

    const protectedResponse = await updateSession(
      new NextRequest("https://app.test/dashboard")
    );
    const publicResponse = await updateSession(
      new NextRequest("https://app.test/login")
    );

    expect(getRedirectUrl(protectedResponse)).toContain("/login?next=%2Fdashboard");
    expect(getRedirectUrl(publicResponse)).toBeNull();
  });

  it("meneruskan cookie dan header refresh pada response normal", async () => {
    setAuthResult({ id: "user-1" }, null, refreshSession);
    const request = new NextRequest("https://app.test/dashboard");

    const response = await updateSession(request);

    expect(request.cookies.get("sb-auth-token")?.value).toBe("refreshed-token");
    expect(response.cookies.get("sb-auth-token")?.value).toBe("refreshed-token");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  it("meneruskan cookie dan header refresh pada response redirect", async () => {
    setAuthResult({ id: "user-1" }, null, refreshSession);
    const request = new NextRequest("https://app.test/login");

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toContain("/dashboard");
    expect(response.cookies.get("sb-auth-token")?.value).toBe("refreshed-token");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });
});

describe("updateSession — session timeout", () => {
  it("memaksa logout saat inaktivitas melebihi 24 jam", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");
    request.cookies.set(
      "erp_last_active",
      String(Date.now() - 25 * 60 * 60 * 1000)
    );

    const response = await updateSession(request);
    const location = new URL(getRedirectUrl(response) ?? "");

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("reason")).toBe("inactivity");
    expect(response.cookies.get("erp_last_active")?.value).toBe("");
    expect(response.cookies.get("erp_session_start")?.value).toBe("");
  });

  it("memperbarui cookie erp_last_active saat aktivitas masih fresh", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");
    request.cookies.set("erp_last_active", String(Date.now() - 60 * 60 * 1000));

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    const lastActive = Number(response.cookies.get("erp_last_active")?.value);
    expect(Number.isFinite(lastActive)).toBe(true);
    expect(Math.abs(lastActive - Date.now())).toBeLessThan(5000);
  });

  it("menyetel erp_last_active dan erp_session_start untuk sesi baru", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
    const lastActive = Number(response.cookies.get("erp_last_active")?.value);
    const sessionStart = Number(
      response.cookies.get("erp_session_start")?.value
    );
    expect(Math.abs(lastActive - Date.now())).toBeLessThan(5000);
    expect(Math.abs(sessionStart - Date.now())).toBeLessThan(5000);
  });

  it("memaksa logout saat sesi melebihi batas 7 hari meski aktif", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    request.cookies.set("erp_last_active", String(Date.now()));
    request.cookies.set("erp_session_start", String(eightDaysAgo));

    const response = await updateSession(request);
    const location = new URL(getRedirectUrl(response) ?? "");

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(location.searchParams.get("reason")).toBe("expired");
  });

  it("tidak memaksa logout saat sesi belum mencapai 7 hari", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");
    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    request.cookies.set("erp_last_active", String(Date.now()));
    request.cookies.set("erp_session_start", String(sixDaysAgo));

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
    // Cookie awal sesi sengaja tidak disentuh — tetap bertahan di browser.
    expect(response.cookies.get("erp_session_start")).toBeUndefined();
  });

  it("mengabaikan cookie pelacak dengan nilai bukan timestamp", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");
    request.cookies.set("erp_last_active", "bukan-timestamp");
    request.cookies.set("erp_session_start", "juga-bukan-timestamp");

    const response = await updateSession(request);

    expect(getRedirectUrl(response)).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("menghapus cookie sesi Supabase saat timeout inaktivitas", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/dashboard");
    request.cookies.set("sb-auth-token", "stale-token");
    request.cookies.set(
      "erp_last_active",
      String(Date.now() - 25 * 60 * 60 * 1000)
    );

    const response = await updateSession(request);

    expect(response.cookies.get("sb-auth-token")?.value).toBe("");
  });

  it("membatasi maxAge cookie sesi maksimal 7 hari", async () => {
    setAuthResult({ id: "user-1" }, null, () =>
      refreshSession({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 400 * 24 * 60 * 60,
      })
    );
    const request = new NextRequest("https://app.test/dashboard");

    const response = await updateSession(request);

    expect(response.cookies.get("sb-auth-token")?.maxAge).toBe(604800);
  });

  it("mempertahankan maxAge 0 untuk penghapusan cookie", async () => {
    setAuthResult({ id: "user-1" }, null, () =>
      refreshSession({
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 0,
      })
    );
    const request = new NextRequest("https://app.test/dashboard");

    const response = await updateSession(request);

    expect(response.cookies.get("sb-auth-token")?.maxAge).toBe(0);
  });

  it("tetap mengizinkan halaman login saat timeout inaktivitas", async () => {
    setAuthResult({ id: "user-1" });
    const request = new NextRequest("https://app.test/login");
    request.cookies.set(
      "erp_last_active",
      String(Date.now() - 25 * 60 * 60 * 1000)
    );

    const response = await updateSession(request);
    const location = new URL(getRedirectUrl(response) ?? "");

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("reason")).toBe("inactivity");
  });
});

describe("proxy matcher", () => {
  it("menjalankan proxy pada route aplikasi", () => {
    for (const url of ["/dashboard", "/login", "/auth/callback"]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    }
  });

  it("tidak menjalankan proxy pada aset statis", () => {
    for (const url of [
      "/_next/static/chunk.js",
      "/_next/image",
      "/favicon.ico",
      "/logo.svg",
      "/photo.png",
      "/photo.jpg",
      "/photo.webp",
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    }
  });
});
