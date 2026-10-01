"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { readUpdateInvoiceStatusInput } from "@/features/invoices/schema";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export async function updateInvoiceStatus(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({ permission: PERMISSIONS.financeInvoiceManage });
  if ("error" in guard) return { error: guard.error };

  const parsed = readUpdateInvoiceStatusInput(formData);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: parsed.command.status })
    .eq("id", parsed.command.id)
    .eq("school_id", guard.user.profile.school_id ?? "");

  if (error) {
    console.error("[invoice] update status:", error);
    return { error: "Gagal memperbarui status invoice." };
  }

  revalidatePath("/keuangan/invoice");
  return { success: "Status invoice diperbarui." };
}
