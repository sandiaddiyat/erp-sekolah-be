"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import {
  LAST_ACTIVE_COOKIE,
  SESSION_START_COOKIE,
} from "@/lib/supabase/session-timeout";

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[sign-out]", error);
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(LAST_ACTIVE_COOKIE);
  cookieStore.delete(SESSION_START_COOKIE);

  redirect("/login?loggedOut=1");
}
