import { createClient } from "@/lib/supabase/server";
import type { Invoice, InvoiceDetail } from "@/lib/types";

export async function getInvoices(schoolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, school_id, student_id, guardian_id, academic_year_id, period_label, issue_date, due_date, total_amount, status, students!invoices_student_tenant_fkey(nama_lengkap)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Invoice[];
}

export async function getInvoiceDetails(schoolId: string, invoiceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoice_details")
    .select("id, school_id, invoice_id, fee_structure_id, description, base_amount, discount_amount, final_amount")
    .eq("school_id", schoolId)
    .eq("invoice_id", invoiceId)
    .order("created_at");
  if (error) throw error;
  return data as InvoiceDetail[];
}
