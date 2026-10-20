import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CurrentUser, Profile, School } from "@/lib/types";
import { getReceiptRecord, renderReceipt, type ReceiptViewModel } from "@/features/receipt-templates/service";

export type PublicReceipt = { receipt: ReceiptViewModel; rendered: ReturnType<typeof renderReceipt> };

export async function getPublicReceipt(deps: { supabase: SupabaseClient<Database> }, token: string): Promise<PublicReceipt | null> {
  const { data: access } = await deps.supabase
    .from("receipt_access_tokens")
    .select("id, school_id, payment_id, expires_at, view_count")
    .eq("token", token)
    .maybeSingle();

  if (!access || new Date(access.expires_at).getTime() < Date.now()) return null;

  await deps.supabase
    .from("receipt_access_tokens")
    .update({ view_count: (access.view_count ?? 0) + 1 })
    .eq("id", access.id);

  const { data: school } = await deps.supabase.from("schools").select("*").eq("id", access.school_id).maybeSingle();
  if (!school) return null;

  const current: CurrentUser = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "public-receipt@erp-sekolah.local",
    profile: {
      id: "00000000-0000-0000-0000-000000000000",
      school_id: access.school_id,
      full_name: "Sistem Kuitansi Publik",
      is_super_admin: false,
    } as unknown as Profile,
    school: school as School,
    roles: [],
    permissions: [],
    isSuperAdmin: false,
  };

  const receipt = await getReceiptRecord({ supabase: deps.supabase }, current, access.payment_id);
  return receipt ? { receipt, rendered: renderReceipt(receipt) } : null;
}
