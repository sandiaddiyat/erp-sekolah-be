"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import { readSaveWhatsAppSettingsInput, readSendBulkInvoiceWAInput, readSendTestWhatsAppInput } from "@/features/whatsapp/schema";
import {
  saveWhatsAppSettingsRecord,
  sendBulkInvoiceNotifications,
  sendTestWhatsApp as sendTestWhatsAppService,
} from "@/features/whatsapp/service";

const settingsPath = "/keuangan/pengaturan-wa";

export async function saveWhatsAppSettings(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.financeWhatsAppManage, deniedMessage: "Anda tidak punya izin mengelola WhatsApp." });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSaveWhatsAppSettingsInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await saveWhatsAppSettingsRecord({ supabase: await createClient() }, guard.user, parsed.command);
  if (!result.ok) return { error: result.error };
  revalidatePath(settingsPath);
  return { success: result.message };
}

export async function sendTestWhatsApp(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.financeWhatsAppManage, deniedMessage: "Anda tidak punya izin menguji WhatsApp." });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSendTestWhatsAppInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await sendTestWhatsAppService({ supabase: await createClient() }, guard.user, parsed.command.phone);
  return result.ok ? { success: result.message } : { error: result.error };
}

export async function sendBulkInvoiceWAAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.billingManage, deniedMessage: "Anda tidak punya izin mengirim tagihan." });
  if ("error" in guard) return { error: guard.error };
  const parsed = readSendBulkInvoiceWAInput(formData);
  if (!parsed.ok) return { error: parsed.error };
  const result = await sendBulkInvoiceNotifications({ supabase: await createClient() }, guard.user, parsed.command.invoice_ids);
  return result.ok ? { success: result.message } : { error: result.error };
}
