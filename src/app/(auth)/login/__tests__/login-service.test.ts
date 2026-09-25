// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type {
  LoginFailureLimiter,
  LoginLimitDecision,
} from "@/lib/rate-limit/login-failure-limiter";
import { signInWithLimiter, safeNextPath } from "../login-service";

type AuthResult = {
  data: { user: { id: string } | null };
  error: { message: string; status?: number } | null;
};

type SupabaseStub = SupabaseClient<Database> & {
  signInWithPassword: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
};

const identity = { email: "admin@school.test", ip: "203.0.113.10" };
const command = {
  email: identity.email,
  password: "password",
  next: "/dashboard",
};

function makeLimiter(
  decision: LoginLimitDecision = { blocked: false, dimension: null, retryAfterMs: 0 }
): LoginFailureLimiter & {
  recordFailure: ReturnType<typeof vi.fn>;
  recordSuccess: ReturnType<typeof vi.fn>;
  cancelAttempt: ReturnType<typeof vi.fn>;
} {
  return {
    beginAttempt: vi.fn().mockResolvedValue({ ...decision, attemptId: "attempt-1" }),
    recordFailure: vi.fn().mockResolvedValue(decision),
    recordSuccess: vi.fn().mockResolvedValue(undefined),
    cancelAttempt: vi.fn().mockResolvedValue(undefined),
  };
}

function makeSupabase(
  result: AuthResult,
  profile: { is_active: boolean } | null = { is_active: true }
) {
  const profileQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: profile, error: null }),
  };
  const supabase = {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(result),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table !== "profiles") throw new Error(`unexpected table ${table}`);
      return {
        select: vi.fn().mockReturnValue(profileQuery),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
        }),
      };
    }),
  } as unknown as SupabaseStub;
  return { supabase };
}

describe("signInWithLimiter", () => {
  it("tidak memanggil Supabase ketika attempt diblokir", async () => {
    const limiter = makeLimiter({
      blocked: true,
      dimension: "email",
      retryAfterMs: 10_000,
    });
    const createSupabase = vi.fn();

    const result = await signInWithLimiter(command, identity, {
      limiter,
      createSupabase,
    });

    expect(result).toEqual({
      error:
        "Terlalu banyak percobaan masuk. Silakan coba lagi beberapa menit lagi.",
    });
    expect(createSupabase).not.toHaveBeenCalled();
  });

  it("mencatat credential failure pada kedua dimensi", async () => {
    const limiter = makeLimiter();
    const { supabase } = makeSupabase({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    const result = await signInWithLimiter(command, identity, {
      limiter,
      createSupabase: async () => supabase,
    });

    expect(result).toEqual({ error: "Email atau password salah." });
    expect(limiter.recordFailure).toHaveBeenCalledWith(identity, "attempt-1");
    expect(limiter.cancelAttempt).not.toHaveBeenCalled();
  });

  it("membatalkan attempt untuk error infrastructure", async () => {
    const limiter = makeLimiter();
    const { supabase } = makeSupabase({
      data: { user: null },
      error: { message: "Service unavailable", status: 503 },
    });

    const result = await signInWithLimiter(command, identity, {
      limiter,
      createSupabase: async () => supabase,
    });

    expect(result).toEqual({
      error: "Layanan masuk sedang tidak tersedia. Silakan coba lagi sebentar.",
    });
    expect(limiter.cancelAttempt).toHaveBeenCalledWith(identity, "attempt-1");
    expect(limiter.recordFailure).not.toHaveBeenCalled();
  });

  it("membersihkan limiter dan redirect setelah profile aktif", async () => {
    const limiter = makeLimiter();
    const { supabase } = makeSupabase({ data: { user: { id: "user-1" } }, error: null });

    const result = await signInWithLimiter(command, identity, {
      limiter,
      createSupabase: async () => supabase,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({ destination: "/dashboard" });
    expect(limiter.recordSuccess).toHaveBeenCalledWith(identity, "attempt-1");
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it("tidak menghapus counter untuk akun nonaktif", async () => {
    const limiter = makeLimiter();
    const { supabase } = makeSupabase(
      { data: { user: { id: "user-1" } }, error: null },
      { is_active: false }
    );

    const result = await signInWithLimiter(command, identity, {
      limiter,
      createSupabase: async () => supabase,
    });

    expect(result).toEqual({
      error: "Akun kamu dinonaktifkan. Hubungi administrator sekolah.",
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(limiter.recordFailure).toHaveBeenCalledWith(identity, "attempt-1");
    expect(limiter.recordSuccess).not.toHaveBeenCalled();
  });

  it("melakukan sign out ketika clear limiter gagal", async () => {
    const limiter = makeLimiter();
    limiter.recordSuccess.mockRejectedValueOnce(new Error("redis down"));
    const { supabase } = makeSupabase({ data: { user: { id: "user-1" } }, error: null });

    const result = await signInWithLimiter(command, identity, {
      limiter,
      createSupabase: async () => supabase,
    });

    expect(result).toEqual({
      error: "Layanan masuk sedang tidak tersedia. Silakan coba lagi sebentar.",
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});

describe("safeNextPath", () => {
  it("menolak redirect eksternal dan control character", () => {
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("\\\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\t/evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\n/evil.example")).toBe("/dashboard");
    expect(safeNextPath("/siswa?tab=aktif")).toBe("/siswa?tab=aktif");
  });
});
