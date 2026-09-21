"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  deleteBillItemRecord,
  saveBillItemRecord,
} from "@/features/keuangan/service";
import { readSaveBillItemInput } from "@/features/keuangan/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidate() {
  revalidatePath("/keuangan/jenis-tagihan");
  revalidatePath("/keuangan");
}

export async function saveBillItem(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeBillItemManage,
    deniedMessage: "Anda tidak punya izin mengelola jenis tagihan.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveBillItemInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveBillItemRecord({ supabase }, guard.user, command.command);

  if (!result.ok) return { error: result.error };

  revalidate();
  return { success: result.message };
}

export async function deleteBillItem(billItemId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeBillItemManage,
    deniedMessage: "Anda tidak punya izin mengelola jenis tagihan.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteBillItemRecord({ supabase }, guard.user, billItemId);

  if (!result.ok) return { error: result.error };

  revalidate();
  return { success: result.message };
}
