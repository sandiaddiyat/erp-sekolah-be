import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("requireEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("mengembalikan nilai jika env ada", async () => {
    process.env.TEST_VAR = "test_value";
    const { requireEnv } = await import("@/lib/env");
    expect(requireEnv("TEST_VAR")).toBe("test_value");
  });

  it("throw error jika env tidak ada", async () => {
    delete process.env.MISSING_VAR;
    const { requireEnv } = await import("@/lib/env");
    expect(() => requireEnv("MISSING_VAR")).toThrow("MISSING_VAR");
  });
});
