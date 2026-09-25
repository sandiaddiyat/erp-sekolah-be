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

function refreshSession() {
  cookieAdapter.setAll(
    [
      {
        name: "sb-auth-token",
        value: "refreshed-token",
        options: { httpOnly: true, path: "/", sameSite: "lax" },
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
  cookieAdapter = {
    getAll: vi.fn(() => []),
    setAll: vi.fn(),
  };
  mocks.createServerClient.mockReset();
  mocks.createServerClient.mockImplementation((_url, _key, options) => {
    cookieAdapter = options.cookies as TestCookieAdapter;
    return { auth: { getUser } };
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
