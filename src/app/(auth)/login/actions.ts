"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  beginAttempt,
  recordFailure,
  recordSuccess,
  clearSession,
  clientIp,
} from "@/lib/rate-limit";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  next: z.string().optional(),
});

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

  const { attemptId, blocked } = await beginAttempt(email, ip);
  if (blocked) {
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
    await recordFailure(attemptId, email, ip);
    return { error: "Email atau password salah." };
  }

  await recordSuccess(attemptId, email, ip);

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile && profile.is_active === false) {
    await supabase.auth.signOut();
    await clearSession(email, ip);
    return { error: "Akun kamu dinonaktifkan. Hubungi administrator sekolah." };
  }

  await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", data.user.id);

  redirect(safeNextPath(parsed.data.next));
}
