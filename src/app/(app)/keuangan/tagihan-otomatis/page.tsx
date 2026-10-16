import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Invoice, InvoiceDetail, BillingRunLog } from "@/lib/types";

type FeeCategoryOption = { id: string; name: string; billing_cycle: string };
type FeeStructureDueOption = {
  id: string;
  academic_year_id: string;
  fee_category_id: string;
  due_day: number | null;
  due_date: string | null;
};
import { TagihanOtomatisClient } from "./tagihan-otomatis-client";

export const metadata = { title: "Tagihan Otomatis" };

export default async function TagihanOtomatisPage() {
  const current = await requirePermission(PERMISSIONS.billingView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [yearsResult, invoicesResult, detailsResult, logsResult, categoriesResult, structuresResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("id, name, status, start_date, end_date")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase
      .from("invoices")
      .select("*, students!invoices_student_tenant_fkey(nama_lengkap)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoice_details")
      .select("id, school_id, invoice_id, fee_structure_id, description, base_amount, discount_amount, final_amount, created_at")
      .eq("school_id", schoolId),
    supabase
      .from("billing_run_logs")
      .select("*")
      .eq("school_id", schoolId)
      .order("run_at", { ascending: false }),
    supabase
      .from("fee_categories")
      .select("id, name, billing_cycle")
      .eq("school_id", schoolId)
      .order("name", { ascending: true }),
    supabase
      .from("fee_structures")
      .select("id, academic_year_id, fee_category_id, due_day, due_date")
      .eq("school_id", schoolId),
  ]);

  const loadError =
    yearsResult.error ??
    invoicesResult.error ??
    detailsResult.error ??
    logsResult.error ??
    categoriesResult.error ??
    structuresResult.error;
  if (loadError) {
    console.error("[tagihan-otomatis]", loadError);
    return <DataError message="Gagal memuat data tagihan otomatis." />;
  }

  const detailsByInvoice = new Map<string, InvoiceDetail[]>();
  for (const detail of (detailsResult.data ?? []) as InvoiceDetail[]) {
    const details = detailsByInvoice.get(detail.invoice_id) ?? [];
    details.push(detail);
    detailsByInvoice.set(detail.invoice_id, details);
  }

  const invoices = ((invoicesResult.data ?? []) as unknown as Invoice[]).map((invoice) => ({
    ...invoice,
    invoice_details: detailsByInvoice.get(invoice.id) ?? [],
  }));

  return (
    <TagihanOtomatisClient
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      feeCategories={(categoriesResult.data ?? []) as FeeCategoryOption[]}
      feeStructures={(structuresResult.data ?? []) as FeeStructureDueOption[]}
      invoices={invoices}
      billingRuns={(logsResult.data ?? []) as BillingRunLog[]}
      canManage={can(current.permissions, PERMISSIONS.billingManage, current.isSuperAdmin)}
    />
  );
}
