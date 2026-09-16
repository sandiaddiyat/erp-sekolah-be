"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  createBillRecord,
  deleteBillItemRecord,
  deleteBillRecord,
  recordPaymentRecord,
  saveBillItemRecord,
  verifyPaymentRecord,
} from "@/features/keuangan/service";
import {
  readSaveBillInput,
  readSaveBillItemInput,
  readSavePaymentInput,
  readVerifyPaymentInput,
} from "@/features/keuangan/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateKeuanganPages() {
  revalidatePath("/keuangan");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutan selalu
 *   guard -> parse & validasi input -> service -> revalidate.
 */
export async function createBill(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeBillCreate,
    deniedMessage: "Anda tidak punya izin membuat tagihan.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveBillInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await createBillRecord({ supabase }, guard.user, command.command);

  if (!result.ok) return { error: result.error };

  revalidateKeuanganPages();
  return { success: result.message };
}

export async function recordPayment(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financePaymentCreate,
    deniedMessage: "Anda tidak punya izin mencatat pembayaran.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSavePaymentInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await recordPaymentRecord(
    { supabase },
    guard.user,
    command.command
  );

  if (!result.ok) return { error: result.error };

  revalidateKeuanganPages();
  return { success: result.message };
}

export async function verifyPayment(
  paymentId: string,
  keputusan: "terverifikasi" | "ditolak"
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financePaymentVerify,
    deniedMessage: "Anda tidak punya izin memverifikasi pembayaran.",
  });
  if ("error" in guard) return { error: guard.error };

  const parsed = readVerifyPaymentInput(
    (() => {
      const fd = new FormData();
      fd.append("payment_id", paymentId);
      fd.append("keputusan", keputusan);
      return fd;
    })()
  );
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const result = await verifyPaymentRecord({ supabase }, guard.user, parsed.command);

  if (!result.ok) return { error: result.error };

  revalidateKeuanganPages();
  return { success: result.message };
}

export async function deleteBill(billId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeBillCreate,
    deniedMessage: "Anda tidak punya izin menghapus tagihan.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteBillRecord({ supabase }, guard.user, billId);

  if (!result.ok) return { error: result.error };

  revalidateKeuanganPages();
  return { success: result.message };
}

export async function saveBillItem(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeBillCreate,
    deniedMessage: "Anda tidak punya izin mengelola jenis tagihan.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readSaveBillItemInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveBillItemRecord({ supabase }, guard.user, command.command);

  if (!result.ok) return { error: result.error };

  revalidateKeuanganPages();
  return { success: result.message };
}

export async function deleteBillItem(billItemId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.financeBillCreate,
    deniedMessage: "Anda tidak punya izin mengelola jenis tagihan.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteBillItemRecord({ supabase }, guard.user, billItemId);

  if (!result.ok) return { error: result.error };

  revalidateKeuanganPages();
  return { success: result.message };
}
