// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  LOGIN_RATE_LIMIT_POLICY,
  LoginRateLimitConfigurationError,
  createLoginFailureLimiterFromEnv,
  createLoginLimitKeys,
  createMemoryLoginFailureLimiter,
  createUpstashLoginFailureLimiter,
  type LoginIdentity,
} from "@/lib/rate-limit/login-failure-limiter";

const identity: LoginIdentity = {
  email: "admin@school.test",
  ip: "203.0.113.10",
};

const shortPolicy = {
  maxFailures: 2,
  windowMs: 1_000,
  blockMs: 500,
  reservationMs: 100,
} as const;

describe("createLoginLimitKeys", () => {
  it("menormalisasi email dan tidak menyimpan identifier mentah", () => {
    const keys = createLoginLimitKeys({
      email: " ADMIN@School.Test ",
      ip: identity.ip,
    });

    expect(keys.email).toMatch(/^erp-sekolah:login:\{v1\}:email:[a-f0-9]{64}$/);
    expect(keys.ip).toMatch(/^erp-sekolah:login:\{v1\}:ip:[a-f0-9]{64}$/);
    expect(keys.email).toBe(
      createLoginLimitKeys({ email: "admin@school.test", ip: identity.ip })
        .email
    );
    expect(`${keys.email}${keys.ip}`).not.toContain(identity.email);
    expect(`${keys.email}${keys.ip}`).not.toContain(identity.ip);
  });
});

describe("createMemoryLoginFailureLimiter", () => {
  it("memblokir pada kegagalan kelima dan berakhir setelah blockMs", async () => {
    let now = 1_000;
    const limiter = createMemoryLoginFailureLimiter({
      now: () => now,
      policy: LOGIN_RATE_LIMIT_POLICY,
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const started = await limiter.beginAttempt(identity);
      expect(started.attemptId).not.toBeNull();
      const decision = await limiter.recordFailure(identity, started.attemptId!);
      expect(decision.blocked).toBe(false);
    }

    const fifthStarted = await limiter.beginAttempt(identity);
    const fifth = await limiter.recordFailure(identity, fifthStarted.attemptId!);
    expect(fifth).toEqual({
      blocked: true,
      dimension: "email",
      retryAfterMs: LOGIN_RATE_LIMIT_POLICY.blockMs,
    });

    now += LOGIN_RATE_LIMIT_POLICY.blockMs - 1;
    expect((await limiter.beginAttempt(identity)).blocked).toBe(true);

    now += 1;
    expect((await limiter.beginAttempt(identity)).blocked).toBe(false);
  });

  it("memulai window baru setelah windowMs tanpa block", async () => {
    let now = 1_000;
    const limiter = createMemoryLoginFailureLimiter({
      now: () => now,
      policy: shortPolicy,
    });

    const first = await limiter.beginAttempt(identity);
    expect((await limiter.recordFailure(identity, first.attemptId!)).blocked).toBe(false);
    now += shortPolicy.windowMs;
    const second = await limiter.beginAttempt(identity);
    expect(second.attemptId).not.toBeNull();
    expect((await limiter.recordFailure(identity, second.attemptId!)).blocked).toBe(false);
  });

  it("membatasi attempt paralel dan melepas reservation saat cancel", async () => {
    const limiter = createMemoryLoginFailureLimiter({
      policy: shortPolicy,
    });

    const first = await limiter.beginAttempt(identity);
    const second = await limiter.beginAttempt(identity);
    expect(first.attemptId).not.toBeNull();
    expect(second.attemptId).not.toBeNull();
    expect((await limiter.beginAttempt(identity)).blocked).toBe(true);

    await limiter.cancelAttempt(identity, first.attemptId!);
    const third = await limiter.beginAttempt(identity);
    expect(third.attemptId).not.toBeNull();
  });

  it("tidak menghapus counter email saat reservation kedaluwarsa", async () => {
    let now = 1_000;
    const limiter = createMemoryLoginFailureLimiter({
      now: () => now,
      policy: { ...shortPolicy, reservationMs: 100 },
    });

    const failed = await limiter.beginAttempt(identity);
    await limiter.recordFailure(identity, failed.attemptId!);
    const lateSuccess = await limiter.beginAttempt(identity);
    now += 101;
    await limiter.recordSuccess(identity, lateSuccess.attemptId!);

    const secondFailure = await limiter.beginAttempt(identity);
    expect(secondFailure.attemptId).not.toBeNull();
    expect((await limiter.recordFailure(identity, secondFailure.attemptId!)).blocked).toBe(true);
  });
});

describe("createUpstashLoginFailureLimiter", () => {
  it("memakai key dan script yang sama untuk email dan IP", async () => {
    const begin = { eval: vi.fn().mockResolvedValue([0, 0, 0]) };
    const failure = { eval: vi.fn().mockResolvedValue([1, 2, 500]) };
    const release = { eval: vi.fn().mockResolvedValue(1) };
    const createScript = vi
      .fn()
      .mockReturnValueOnce(begin)
      .mockReturnValueOnce(failure)
      .mockReturnValueOnce(release);
    const redis = { createScript };

    const limiter = createUpstashLoginFailureLimiter(redis, {
      now: () => 1_000,
      policy: shortPolicy,
    });

    const started = await limiter.beginAttempt(identity);
    expect(started.attemptId).not.toBeNull();
    const decision = await limiter.recordFailure(identity, started.attemptId!);
    await limiter.recordSuccess(identity, started.attemptId!);

    const keys = createLoginLimitKeys(identity);
    expect(begin.eval).toHaveBeenCalledWith([keys.email, keys.ip], [
      "1000",
      "1000",
      "2",
      "100",
      started.attemptId,
    ]);
    expect(failure.eval).toHaveBeenCalledWith([keys.email, keys.ip], [
      "1000",
      "1000",
      "2",
      "500",
      started.attemptId,
    ]);
    expect(release.eval).toHaveBeenCalledWith([keys.email, keys.ip], [
      "1000",
      started.attemptId,
      "1",
    ]);
    expect(decision).toEqual({ blocked: true, dimension: "ip", retryAfterMs: 500 });
  });

  it("menolak respons Redis malformed", async () => {
    const script = { eval: vi.fn().mockResolvedValue(["bad"]) };
    const limiter = createUpstashLoginFailureLimiter({
      createScript: () => script,
    });

    await expect(limiter.beginAttempt(identity)).rejects.toThrow(
      "Respons rate limiter Redis tidak valid."
    );
  });
});

describe("createLoginFailureLimiterFromEnv", () => {
  it("fallback memory hanya di development", () => {
    const limiter = createLoginFailureLimiterFromEnv({
      env: { NODE_ENV: "development" },
    });

    expect(limiter).toBeDefined();
  });

  it("gagal closed di production tanpa konfigurasi Redis", () => {
    expect(() =>
      createLoginFailureLimiterFromEnv({ env: { NODE_ENV: "production" } })
    ).toThrow(LoginRateLimitConfigurationError);
  });

  it("menolak URL Redis non-HTTPS", () => {
    expect(() =>
      createLoginFailureLimiterFromEnv({
        env: {
          NODE_ENV: "production",
          UPSTASH_REDIS_REST_URL: "http://redis.test",
          UPSTASH_REDIS_REST_TOKEN: "token",
        },
      })
    ).toThrow("URL HTTPS");
  });
});
