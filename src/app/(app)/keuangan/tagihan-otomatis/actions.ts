"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { generateInvoices as generateInvoicesService } from "@/features/billing/service";
import { readGenerateInvoicesInput } from "@/features/billing/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

export async function runGenerateInvoices(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.billingManage,
    deniedMessage: "Anda tidak punya izin menjalankan job billing.",
  });
  if ("error" in guard) return { error: guard.error };

  const command = readGenerateInvoicesInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await generateInvoicesService({ supabase }, guard.user, command.command);

  if (!result.ok) return { error: result.error };

  revalidatePath("/keuangan/tagihan-otomatis");
  revalidatePath("/keuangan");
  return { success: result.message };
}
