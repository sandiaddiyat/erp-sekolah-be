import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { ReceiptTemplate } from "@/lib/types";
import { ReceiptSettingsClient } from "./receipt-settings-client";

export const metadata = { title: "Pengaturan Kuitansi" };

export default async function ReceiptSettingsPage() {
  const current = await requirePermission(PERMISSIONS.financeReceiptTemplateView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";
  const { data, error } = await supabase
    .from("receipt_templates")
    .select("*")
    .eq("school_id", schoolId)
    .order("is_default", { ascending: false })
    .order("name");

  if (error) {
    console.error("[receipt-templates]", error);
    return <DataError message="Gagal memuat template kuitansi." />;
  }

  return (
    <ReceiptSettingsClient
      templates={(data ?? []) as ReceiptTemplate[]}
      canManage={current.isSuperAdmin || current.permissions.includes(PERMISSIONS.financeReceiptTemplateManage)}
    />
  );
}
