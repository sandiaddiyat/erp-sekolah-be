import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  type LoginFailureLimiter,
  type LoginIdentity,
} from "@/lib/rate-limit/login-failure-limiter";

export type LoginServiceResult =
  | { destination: string }
  | { error: string };

export type LoginServiceDeps = {
  limiter: LoginFailureLimiter;
  createSupabase: () => Promise<SupabaseClient<Database>>;
  now?: () => Date;
};

export type LoginCommand = {
  email: string;
  password: string;
  next?: string;
};

const RATE_LIMIT_ERROR =
  "Terlalu banyak percobaan masuk. Silakan coba lagi beberapa menit lagi.";
const INVALID_CREDENTIALS_ERROR = "Email atau password salah.";
const INACTIVE_ACCOUNT_ERROR =
  "Akun kamu dinonaktifkan. Hubungi administrator sekolah.";
const SERVICE_ERROR =
  "Layanan masuk sedang tidak tersedia. Silakan coba lagi sebentar.";

export function safeNextPath(next: string | undefined): string {
  if (!next) return "/dashboard";
  if (/[\u0000-\u001f\u007f]/.test(next)) return "/dashboard";
  const normalized = next.replace(/\\/g, "/");
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return "/dashboard";
  }
  const base = new URL("https://internal.invalid");
  try {
    const parsed = new URL(normalized, base);
    return parsed.origin === base.origin ? normalized : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

function logLoginError(scope: string, error: unknown) {
  console.error(`[login:${scope}]`, error);
}

function isCredentialError(error: { message?: string; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("invalid login credentials") ||
    message.includes("email not confirmed") ||
    message.includes("user not found")
  );
}

export async function signInWithLimiter(
  command: LoginCommand,
  identity: LoginIdentity,
  deps: LoginServiceDeps
): Promise<LoginServiceResult> {
  const attempt = await deps.limiter.beginAttempt(identity);
  if (attempt.blocked || !attempt.attemptId) return { error: RATE_LIMIT_ERROR };
  const attemptId = attempt.attemptId;

  try {
    const supabase = await deps.createSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identity.email,
      password: command.password,
    });

    if (error || !data.user) {
      if (error && !isCredentialError(error)) {
        await deps.limiter.cancelAttempt(identity, attemptId);
        return { error: SERVICE_ERROR };
      }
      await deps.limiter.recordFailure(identity, attemptId);
      return { error: INVALID_CREDENTIALS_ERROR };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut().catch((signOutError) => {
        logLoginError("sign-out-profile", signOutError);
      });
      await deps.limiter.cancelAttempt(identity, attemptId);
      return { error: SERVICE_ERROR };
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut().catch((signOutError) => {
        logLoginError("sign-out-inactive", signOutError);
      });
      await deps.limiter.recordFailure(identity, attemptId);
      return { error: INACTIVE_ACCOUNT_ERROR };
    }

    try {
      await deps.limiter.recordSuccess(identity, attemptId);
    } catch (error) {
      logLoginError("clear", error);
      await supabase.auth.signOut().catch((signOutError) => {
        logLoginError("sign-out-clear", signOutError);
      });
      return { error: SERVICE_ERROR };
    }

    const now = deps.now?.() ?? new Date();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ last_login_at: now.toISOString() })
      .eq("id", data.user.id);

    if (updateError) {
      logLoginError("last-login", updateError);
      await supabase.auth.signOut().catch((signOutError) => {
        logLoginError("sign-out-update", signOutError);
      });
      return { error: SERVICE_ERROR };
    }

    return { destination: safeNextPath(command.next) };
  } catch (error) {
    logLoginError("unexpected", error);
    await deps.limiter.cancelAttempt(identity, attemptId).catch((limiterError) => {
      logLoginError("cancel", limiterError);
    });
    return { error: SERVICE_ERROR };
  }
}
