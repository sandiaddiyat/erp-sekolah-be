"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[sign-out]", error);
    }
  }
  redirect("/login?loggedOut=1");
}
