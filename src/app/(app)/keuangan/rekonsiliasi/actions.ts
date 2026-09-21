"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  savePaymentMethodRecord,
  deletePaymentMethodRecord,
  saveBankAccountRecord,
  deleteBankAccountRecord,
  recordInvoicePayment,
} from "@/features/payment-v2/service";
import {
  readSavePaymentMethodInput,
  readSaveBankAccountInput,
  readRecordPaymentInput,
} from "@/features/payment-v2/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateReconciliation() {
  revalidatePath("/keuangan/tagihan-otomatis");
  revalidatePath("/keuangan/rekonsiliasi");
}

// ===== Payment Methods =====
export async function savePaymentMethod(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.paymentV2Manage,
    deniedMessage: "Anda tidak punya izin mengelola metode pembayaran.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSavePaymentMethodInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await savePaymentMethodRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateReconciliation();
  return { success: result.message };
}

export async function deletePaymentMethod(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.paymentV2Manage,
    deniedMessage: "Anda tidak punya izin mengelola metode pembayaran.",
  });
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID metode tidak ditemukan." };

  const supabase = await createClient();
  const result = await deletePaymentMethodRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateReconciliation();
  return { success: result.message };
}

// ===== Bank Accounts =====
export async function saveBankAccount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.paymentV2Manage,
    deniedMessage: "Anda tidak punya izin mengelola rekening.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveBankAccountInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveBankAccountRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateReconciliation();
  return { success: result.message };
}

export async function deleteBankAccount(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.paymentV2Manage,
    deniedMessage: "Anda tidak punya izin mengelola rekening.",
  });
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID rekening tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteBankAccountRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateReconciliation();
  return { success: result.message };
}

// ===== Record Payment =====
export async function recordPaymentV2(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.paymentV2Manage,
    deniedMessage: "Anda tidak punya izin mencatat pembayaran.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readRecordPaymentInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await recordInvoicePayment({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateReconciliation();
  return { success: result.message };
}
