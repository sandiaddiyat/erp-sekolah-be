import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { BillItem } from "@/lib/types";
import { JenisTagihanClient } from "./jenis-tagihan-client";

export const metadata = { title: "Jenis Tagihan" };

export default async function JenisTagihanPage() {
  const current = await requirePermission(PERMISSIONS.financeBillItemView);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bill_items")
    .select("id, nama_item, nominal, frekuensi")
    .order("nama_item");

  if (error) return <DataError message="Gagal memuat data jenis tagihan." />;

  const billItems = (data ?? []) as BillItem[];

  return (
    <JenisTagihanClient
      billItems={billItems}
      canManage={can(
        current.permissions,
        PERMISSIONS.financeBillItemManage,
        current.isSuperAdmin
      )}
    />
  );
}
