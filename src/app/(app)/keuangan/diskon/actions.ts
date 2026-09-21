"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  saveDiscountTypeRecord,
  deleteDiscountTypeRecord,
  saveStudentDiscountRecord,
  deleteStudentDiscountRecord,
} from "@/features/discount/service";
import { readSaveDiscountTypeInput, readSaveStudentDiscountInput } from "@/features/discount/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateDiscount() {
  revalidatePath("/keuangan/diskon");
  revalidatePath("/keuangan/tagihan-otomatis");
}

// ===== Discount Types =====
export async function saveDiscountType(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.discountManage,
    deniedMessage: "Anda tidak punya izin mengelola diskon.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveDiscountTypeInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveDiscountTypeRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateDiscount();
  return { success: result.message };
}

export async function deleteDiscountType(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.discountManage,
    deniedMessage: "Anda tidak punya izin mengelola diskon.",
  });
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID jenis diskon tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteDiscountTypeRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateDiscount();
  return { success: result.message };
}

// ===== Student Discounts =====
export async function saveStudentDiscount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.discountManage,
    deniedMessage: "Anda tidak punya izin mengelola diskon.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveStudentDiscountInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveStudentDiscountRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateDiscount();
  return { success: result.message };
}

export async function deleteStudentDiscount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.discountManage,
    deniedMessage: "Anda tidak punya izin mengelola diskon.",
  });
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID diskon tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteStudentDiscountRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateDiscount();
  return { success: result.message };
}
