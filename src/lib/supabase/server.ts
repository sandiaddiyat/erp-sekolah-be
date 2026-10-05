import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { requireEnv } from "@/lib/env";
import { withSessionCookieLimit } from "@/lib/supabase/session-timeout";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withSessionCookieLimit(options))
            );
          } catch {
            // Dipanggil dari Server Component: tidak bisa set cookie, abaikan.
            // Refresh session ditangani middleware.
          }
        },
      },
    }
  );
}
