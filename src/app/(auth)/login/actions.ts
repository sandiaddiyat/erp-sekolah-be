"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  createLoginFailureLimiterFromEnv,
  normalizeLoginEmail,
  type LoginFailureLimiter,
} from "@/lib/rate-limit/login-failure-limiter";
import { getClientIp } from "./request-ip";
import { signInWithLimiter } from "./login-service";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  next: z.string().optional(),
});

const LOGIN_SERVICE_ERROR =
  "Layanan masuk sedang tidak tersedia. Silakan coba lagi sebentar.";

let limiter: LoginFailureLimiter | undefined;

function getLoginLimiter() {
  limiter ??= createLoginFailureLimiterFromEnv();
  return limiter;
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

  let result;
  try {
    const email = normalizeLoginEmail(parsed.data.email);
    const ip = await getClientIp();
    result = await signInWithLimiter(
      {
        email,
        password: parsed.data.password,
        next: parsed.data.next,
      },
      { email, ip },
      {
        limiter: getLoginLimiter(),
        createSupabase: createClient,
      }
    );
  } catch (error) {
    console.error("[login]", error);
    return { error: LOGIN_SERVICE_ERROR };
  }

  if ("error" in result) return { error: result.error };
  redirect(result.destination);
}
