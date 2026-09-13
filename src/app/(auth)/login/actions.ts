"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  next: z.string().optional(),
});

// Rate limiting sederhana berbasis in-memory (per instance). Cukup untuk
// deployment satu instance; untuk multi-instance gunakan penyimpanan bersama
// (Redis/Upstash) di masa depan.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;

type Attempt = { count: number; firstAttemptAt: number; blockedUntil: number };

const attempts = new Map<string, Attempt>();

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function isBlocked(key: string): boolean {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (entry.blockedUntil > Date.now()) return true;
  attempts.delete(key);
  return false;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now, blockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
  }
}

function recordSuccess(key: string): void {
  attempts.delete(key);
}

function safeNextPath(next: string | undefined): string {
  if (!next) return "/dashboard";
  const normalized = next.replace(/\\/g, "/");
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return "/dashboard";
  }
  return normalized;
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!isSupabaseConfigured()) {
    return { error: "Supabase belum dikonfigurasi. Isi file .env.local dulu." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Data yang dimasukkan tidak valid.",
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const ip = await clientIp();

  if (isBlocked(email) || isBlocked(ip)) {
    return {
      error:
        "Terlalu banyak percobaan masuk. Silakan coba lagi beberapa menit lagi.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    recordFailure(email);
    recordFailure(ip);
    return { error: "Email atau password salah." };
  }

  recordSuccess(email);
  recordSuccess(ip);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Akun kamu dinonaktifkan. Hubungi administrator sekolah." };
  }

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  redirect(safeNextPath(parsed.data.next));
}
