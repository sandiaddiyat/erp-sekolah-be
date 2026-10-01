import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceDetail } from "@/lib/types";
import { InvoiceClient } from "./invoice-client";

export type StudentOption = { id: string; nama_lengkap: string };

export default async function InvoicePage() {
  const current = await requirePermission(PERMISSIONS.financeInvoiceView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [invoicesResult, detailsResult, studentsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, school_id, student_id, guardian_id, academic_year_id, period_label, issue_date, due_date, total_amount, status, created_at, updated_at, students!invoices_student_tenant_fkey(nama_lengkap)"
      )
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoice_details")
      .select("id, school_id, invoice_id, fee_structure_id, description, base_amount, discount_amount, final_amount")
      .eq("school_id", schoolId),
    supabase
      .from("students")
      .select("id, nama_lengkap")
      .eq("school_id", schoolId)
      .order("nama_lengkap"),
  ]);

  const loadError =
    invoicesResult.error ?? detailsResult.error ?? studentsResult.error;
  if (loadError) {
    console.error("[invoice]", loadError);
    return <DataError message="Gagal memuat data invoice." />;
  }

  type InvoiceRow = Invoice & {
    students: { nama_lengkap: string } | { nama_lengkap: string }[] | null;
  };

  const invoices = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
  const details = (detailsResult.data ?? []) as InvoiceDetail[];
  const students = (studentsResult.data ?? []) as StudentOption[];

  const invoicesWithStudent = invoices.map((inv) => {
    const student = Array.isArray(inv.students) ? inv.students[0] : inv.students;
    return {
      ...inv,
      student_nama: student?.nama_lengkap ?? null,
    };
  });

  return (
    <InvoiceClient
      invoices={invoicesWithStudent}
      details={details}
      students={students}
      permissions={{
        canManage: current.permissions.includes(PERMISSIONS.financeInvoiceManage),
      }}
    />
  );
}
