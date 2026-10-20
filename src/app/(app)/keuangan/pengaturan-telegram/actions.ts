"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { readSaveTelegramSettingsInput, readSendBulkInvoiceTelegramInput, readSendTestTelegramInput } from "@/features/telegram/schema";
import { getStudentTelegramLink, saveTelegramSettingsRecord, sendBulkInvoiceTelegramNotifications, sendTestTelegram } from "@/features/telegram/service";

const settingsPath = "/keuangan/pengaturan-telegram";

export async function saveTelegramSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.financeTelegramManage, deniedMessage: "Anda tidak punya izin mengelola Telegram." });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSaveTelegramSettingsInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await saveTelegramSettingsRecord({ supabase: await createClient() }, guard.user, parsed.command);
  if (!result.ok) return { error: result.error };
  revalidatePath(settingsPath);
  revalidatePath("/siswa");
  return { success: result.message };
}

export async function sendTestTelegramAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.financeTelegramManage, deniedMessage: "Anda tidak punya izin menguji Telegram." });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSendTestTelegramInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await sendTestTelegram({ supabase: await createClient() }, guard.user, parsed.command.chat_id);
  return result.ok ? { success: result.message } : { error: result.error };
}

export async function sendBulkInvoiceTelegramAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.billingManage, deniedMessage: "Anda tidak punya izin mengirim tagihan." });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSendBulkInvoiceTelegramInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await sendBulkInvoiceTelegramNotifications({ supabase: await createClient() }, guard.user, parsed.command.invoice_ids);
  return result.ok ? { success: result.message } : { error: result.error };
}

export async function generateStudentTelegramLinkAction(studentId: string): Promise<{ url?: string; error?: string }> {
  const guard = await guardAction({ permission: PERMISSIONS.studentsUpdate, deniedMessage: "Anda tidak punya izin membuat tautan Telegram." });
  if ("error" in guard) return { error: guard.error };
  const schoolId = guard.user.profile.school_id;
  if (!schoolId) return { error: "Sekolah aktif tidak ditemukan." };
  const url = await getStudentTelegramLink({ supabase: await createClient() }, studentId, schoolId);
  return url ? { url } : { error: "Bot Telegram belum aktif atau username bot belum tersedia." };
}
