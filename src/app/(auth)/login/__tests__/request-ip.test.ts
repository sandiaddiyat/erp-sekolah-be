// @vitest-environment node

import { describe, expect, it } from "vitest";
import { resolveClientIp } from "../request-ip";

describe("resolveClientIp", () => {
  it("menggunakan header IP Vercel yang valid", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "203.0.113.10, 198.51.100.2",
      "x-forwarded-for": "192.0.2.1",
    });

    expect(
      resolveClientIp(headers, { NODE_ENV: "production", VERCEL: "1" })
    ).toBe("203.0.113.10");
  });

  it("mengabaikan header client-controlled di development", () => {
    const headers = new Headers({ "x-forwarded-for": "192.0.2.1" });

    expect(resolveClientIp(headers, { NODE_ENV: "development" })).toBe(
      "127.0.0.1"
    );
  });

  it("memberikan fallback loopback di development", () => {
    expect(resolveClientIp(new Headers(), { NODE_ENV: "development" })).toBe(
      "127.0.0.1"
    );
  });

  it("gagal closed jika header production tidak valid", () => {
    expect(() =>
      resolveClientIp(new Headers(), { NODE_ENV: "production", VERCEL: "1" })
    ).toThrow("Header IP Vercel");
    expect(() =>
      resolveClientIp(
        new Headers({ "x-vercel-forwarded-for": "not-an-ip" }),
        { NODE_ENV: "production", VERCEL: "1" }
      )
    ).toThrow("Header IP Vercel");
    expect(() =>
      resolveClientIp(new Headers(), { NODE_ENV: "production" })
    ).toThrow("Vercel");
  });
});
