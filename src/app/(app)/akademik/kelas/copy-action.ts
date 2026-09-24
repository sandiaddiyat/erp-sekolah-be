"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { readCopyClassesInput } from "@/features/akademik/schema";
import { copyClassesFromPreviousYear } from "@/features/akademik/service";
import type { FormState } from "@/lib/types";

export async function copyClassesFromPrevious(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.academicsManage,
    deniedMessage: "Anda tidak punya izin mengelola data akademik.",
  });
  if ("error" in guard) return { error: guard.error };

  const parsed = readCopyClassesInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) {
    return { error: "Hanya admin sekolah yang dapat menyalin data kelas." };
  }

  const supabase = await createClient();
  const result = await copyClassesFromPreviousYear({ supabase }, schoolId, parsed.command.targetYearId);
  if (!result.ok) return { error: result.error };

  revalidatePath("/akademik/kelas");

  return { success: `${result.created} kelas disalin, ${result.skipped} dilewati (sudah ada).` };
}
