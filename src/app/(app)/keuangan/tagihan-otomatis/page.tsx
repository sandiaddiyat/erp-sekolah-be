import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Invoice, BillingRunLog } from "@/lib/types";
import { TagihanOtomatisClient } from "./tagihan-otomatis-client";

export const metadata = { title: "Tagihan Otomatis" };

export default async function TagihanOtomatisPage() {
  const current = await requirePermission(PERMISSIONS.billingView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [yearsResult, invoicesResult, logsResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id, name, status")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase
      .from("invoices")
      .select("*, students(nama_lengkap)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase
      .from("billing_run_logs")
      .select("*")
      .eq("school_id", schoolId)
      .order("run_at", { ascending: false }),
  ]);

  if (yearsResult.error || invoicesResult.error || logsResult.error) {
    return <DataError message="Gagal memuat data tagihan otomatis." />;
  }

  return (
    <TagihanOtomatisClient
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      invoices={(invoicesResult.data ?? []) as Invoice[]}
      billingRuns={(logsResult.data ?? []) as BillingRunLog[]}
      canManage={can(current.permissions, PERMISSIONS.billingManage, current.isSuperAdmin)}
    />
  );
}
