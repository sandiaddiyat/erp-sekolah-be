"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { saveSchoolProfileRecord } from "@/features/schools/service";
import { readSaveSchoolProfileInput } from "@/features/schools/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateSchoolPages() {
  revalidatePath("/sekolah");
  revalidatePath("/profil-sekolah");
  revalidatePath("/users");
  revalidatePath("/roles");
  revalidatePath("/dashboard");
}

export async function saveSchoolProfile(
  input: import("@/lib/validations/sekolah").SekolahProfileInput
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.schoolsUpdate,
    deniedMessage: "Anda tidak punya izin mengelola profil sekolah.",
  });
  if ("error" in guard) return { error: guard.error };

  const parsed = readSaveSchoolProfileInput(input);
  if (!parsed.ok) return { error: parsed.error };

  // Admin sekolah hanya boleh mengubah sekolahnya sendiri. Super admin bebas
  // memilih sekolah mana pun. RLS akan menolak upaya di luar itu juga, tapi
  // dicegah lebih awal agar pesannya jelas.
  if (
    !guard.user.isSuperAdmin &&
    parsed.command.id !== guard.user.profile.school_id
  ) {
    return { error: "Anda hanya dapat mengelola profil sekolah Anda sendiri." };
  }

  const supabase = await createClient();
  const result = await saveSchoolProfileRecord(
    { supabase, createAdmin: createAdminClient },
    parsed.command
  );

  if (!result.ok) return { error: result.error };

  revalidateSchoolPages();
  return { success: result.message };
}