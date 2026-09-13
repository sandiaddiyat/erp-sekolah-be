import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

/**
 * Client dengan service role key. MEMBYPASS Row Level Security.
 * Hanya boleh dipakai di kode server (server action / route handler).
 * Ini dibutuhkan untuk membuat akun user baru lewat Supabase Auth Admin API,
 * karena pendaftaran publik dimatikan pada aplikasi multi-tenant.
 */
export function createAdminClient() {
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
