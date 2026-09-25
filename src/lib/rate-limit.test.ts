// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

describe("clientIp", () => {
  beforeEach(() => {
    vi.resetModules();
    (headers as ReturnType<typeof vi.fn>).mockReset();
  });

  it("membaca x-vercel-forwarded-for di environment Vercel", async () => {
    const orig = process.env.VERCEL;
    process.env.VERCEL = "1";

    (headers as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (key: string) => {
        if (key === "x-vercel-forwarded-for") return "203.0.113.50";
        return null;
      },
    });

    const { clientIp } = await import("@/lib/rate-limit");
    const ip = await clientIp();
    expect(ip).toBe("203.0.113.50");
    process.env.VERCEL = orig;
  });

  it("membaca x-forwarded-for di non-Vercel", async () => {
    const orig = process.env.VERCEL;
    process.env.VERCEL = "";

    (headers as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (key: string) => {
        if (key === "x-forwarded-for") return "203.0.113.50";
        return null;
      },
    });

    const { clientIp } = await import("@/lib/rate-limit");
    const ip = await clientIp();
    expect(ip).toBe("203.0.113.50");
    process.env.VERCEL = orig;
  });

  it("menolak header x-forwarded-for palsu di Vercel", async () => {
    const orig = process.env.VERCEL;
    process.env.VERCEL = "1";

    (headers as ReturnType<typeof vi.fn>).mockResolvedValue({
      get: (key: string) => {
        if (key === "x-vercel-forwarded-for") return "203.0.113.50";
        return null;
      },
    });

    const { clientIp } = await import("@/lib/rate-limit");
    const ip = await clientIp();
    expect(ip).toBe("203.0.113.50");
    process.env.VERCEL = orig;
  });
});

describe("rate limiter", () => {
  beforeEach(async () => {
    vi.resetModules();
    await import("@/lib/rate-limit");
    // Reset in-memory state
    const g = globalThis as unknown as { __rateLimitReset?: () => void };
    g.__rateLimitReset?.();
  });

  it("membolehkan 5 attempt lalu memblokir", async () => {
    const { beginAttempt, recordFailure, isBlocked } = await import("@/lib/rate-limit");

    const email = "test@example.com";
    const ip = "192.168.1.1";

    for (let i = 0; i < 5; i++) {
      const { attemptId } = await beginAttempt(email, ip);
      expect(attemptId).toBeTruthy();
      await recordFailure(attemptId, email, ip);
    }

    expect(await isBlocked(email, ip)).toBe(true);
  });

  it("memblokir setelah 6 attempt", async () => {
    const { beginAttempt, recordFailure, isBlocked } = await import("@/lib/rate-limit");

    const email = "test6@example.com";
    const ip = "192.168.1.2";

    for (let i = 0; i < 6; i++) {
      const { attemptId } = await beginAttempt(email, ip);
      await recordFailure(attemptId, email, ip);
    }

    expect(await isBlocked(email, ip)).toBe(true);
  });

  it("mereset counter setelah sukses", async () => {
    const { beginAttempt, recordFailure, recordSuccess, isBlocked } = await import("@/lib/rate-limit");

    const email = "test-reset@example.com";
    const ip = "192.168.1.3";

    for (let i = 0; i < 4; i++) {
      const { attemptId } = await beginAttempt(email, ip);
      await recordFailure(attemptId, email, ip);
    }

    expect(await isBlocked(email, ip)).toBe(false);

    const { attemptId } = await beginAttempt(email, ip);
    await recordSuccess(attemptId, email, ip);

    expect(await isBlocked(email, ip)).toBe(false);
  });

  it("tidak memblokir IP berbeda", async () => {
    const { beginAttempt, recordFailure, isBlocked } = await import("@/lib/rate-limit");

    const email = "test-multi-ip@example.com";

    for (let i = 0; i < 4; i++) {
      const { attemptId } = await beginAttempt(email, "10.0.0.1");
      await recordFailure(attemptId, email, "10.0.0.1");
    }

    // Email dengan IP 10.0.0.1 belum mencapai batas (4 dari 5)
    expect(await isBlocked(email, "10.0.0.1")).toBe(false);
    // IP berbeda tidak terpengaruh
    expect(await isBlocked(email, "10.0.0.2")).toBe(false);
  });
});