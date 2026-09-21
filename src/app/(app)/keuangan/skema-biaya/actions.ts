"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  saveFeeCategoryRecord,
  deleteFeeCategoryRecord,
  saveFeeStructureRecord,
  deleteFeeStructureRecord,
} from "@/features/fee-structure/service";
import { readSaveFeeCategoryInput, readSaveFeeStructureInput } from "@/features/fee-structure/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateSkemaBiaya() {
  revalidatePath("/keuangan/skema-biaya");
  revalidatePath("/keuangan/tagihan-otomatis");
  revalidatePath("/akademik");
}

// ===== Fee Categories =====
export async function saveFeeCategory(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.feeStructureManage,
    deniedMessage: "Anda tidak punya izin mengelola skema biaya.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveFeeCategoryInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveFeeCategoryRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateSkemaBiaya();
  return { success: result.message };
}

export async function deleteFeeCategory(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.feeStructureManage,
    deniedMessage: "Anda tidak punya izin mengelola skema biaya.",
  });
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID kategori biaya tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteFeeCategoryRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateSkemaBiaya();
  return { success: result.message };
}

// ===== Fee Structures =====
export async function saveFeeStructure(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.feeStructureManage,
    deniedMessage: "Anda tidak punya izin mengelola skema biaya.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveFeeStructureInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveFeeStructureRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateSkemaBiaya();
  return { success: result.message };
}

export async function deleteFeeStructure(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.feeStructureManage,
    deniedMessage: "Anda tidak punya izin mengelola skema biaya.",
  });
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID skema biaya tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteFeeStructureRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateSkemaBiaya();
  return { success: result.message };
}
