"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { deleteReceiptTemplateRecord, saveReceiptTemplateRecord } from "./service";
import { readReceiptTemplateId, readSaveReceiptTemplateInput } from "./schema";

const settingsPath = "/keuangan/pengaturan-kuitansi";

export async function saveReceiptTemplate(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeReceiptTemplateManage,
    deniedMessage: "Anda tidak punya izin mengelola template kuitansi.",
  });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSaveReceiptTemplateInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const result = await saveReceiptTemplateRecord({ supabase }, guard.user, parsed.command);
  if (!result.ok) return { error: result.error };
  revalidatePath(settingsPath);
  revalidatePath("/keuangan");
  revalidatePath("/keuangan/rekonsiliasi");
  return { success: result.message };
}

export async function deleteReceiptTemplate(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeReceiptTemplateManage,
    deniedMessage: "Anda tidak punya izin mengelola template kuitansi.",
  });
  if ("error" in guard) return { error: guard.error };
  const parsed = readReceiptTemplateId(formData);
  if (!parsed.ok) return { error: parsed.error };
  const supabase = await createClient();
  const result = await deleteReceiptTemplateRecord({ supabase }, guard.user, parsed.id);
  if (!result.ok) return { error: result.error };
  revalidatePath(settingsPath);
  return { success: result.message };
}
