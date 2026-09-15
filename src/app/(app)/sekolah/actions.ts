"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { saveSchoolRecord, setSchoolStatusRecord } from "@/features/schools/service";
import { readSaveSchoolInput } from "@/features/schools/schema";
import type { FormState, SchoolStatus } from "@/lib/types";

export type { FormState };

function revalidateSchoolPages() {
  revalidatePath("/sekolah");
  revalidatePath("/users");
  revalidatePath("/roles");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutan selalu
 *   guard -> parse & validasi input -> authorize -> service -> revalidate.
 * Semua aturan main ada di service layer; file ini hanya menjembatuhkan
 * FormData dengan service.
 */
export async function saveSchool(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };
  if (!guard.user.isSuperAdmin) {
    return { error: "Hanya super admin yang boleh mengelola sekolah." };
  }

  const input = readSaveSchoolInput(formData);
  if (!input.ok) return { error: input.error };

  const supabase = await createClient();
  const result = await saveSchoolRecord(
    { supabase, createAdmin: createAdminClient },
    input.command
  );

  if (!result.ok) return { error: result.error };

  revalidateSchoolPages();
  return { success: result.message };
}

export async function setSchoolStatus(
  schoolId: string,
  status: SchoolStatus
): Promise<FormState> {
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };
  if (!guard.user.isSuperAdmin) {
    return { error: "Hanya super admin yang boleh mengelola sekolah." };
  }

  const supabase = await createClient();
  const result = await setSchoolStatusRecord({ supabase }, schoolId, status);

  if (!result.ok) return { error: result.error };

  revalidateSchoolPages();
  return { success: result.message };
}
