import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser, Invoice, InvoiceDetail } from "@/lib/types";
import type { CreateManualInvoiceInput } from "./schema";

export async function createManualInvoiceRecord(
  supabase: SupabaseClient<Database>,
  current: CurrentUser,
  input: CreateManualInvoiceInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;
  if (!schoolId) return errResult("Akses ditolak: sekolah tidak ditemukan.");

  const [studentResult, yearResult, feeResult] = await Promise.all([
    supabase.from("students").select("id").eq("id", input.student_id).eq("school_id", schoolId).maybeSingle(),
    supabase.from("academic_years").select("id").eq("id", input.academic_year_id).eq("school_id", schoolId).maybeSingle(),
    input.fee_structure_id
      ? supabase.from("fee_structures").select("id").eq("id", input.fee_structure_id).eq("academic_year_id", input.academic_year_id).eq("school_id", schoolId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (!studentResult.data) return errResult("Siswa tidak ditemukan di sekolah ini.");
  if (!yearResult.data) return errResult("Tahun ajaran tidak ditemukan di sekolah ini.");
  if (input.fee_structure_id && !feeResult.data) return errResult("Skema biaya tidak ditemukan di sekolah ini.");

  const totalAmount = input.nominal - input.diskon;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      school_id: schoolId,
      student_id: input.student_id,
      academic_year_id: input.academic_year_id,
      period_label: input.period_label,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: input.jatuh_tempo,
      total_amount: totalAmount,
      status: "belum_bayar",
      is_manual: true,
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return errResult(serverError(invoiceError, "Gagal membuat tagihan."));
  }

  const { error: detailError } = await supabase.from("invoice_details").insert({
    school_id: schoolId,
    invoice_id: invoice.id,
    fee_structure_id: input.fee_structure_id,
    description: input.period_label,
    base_amount: input.nominal,
    discount_amount: input.diskon,
    final_amount: totalAmount,
  });

  if (detailError) {
    const { error: rollbackError } = await supabase.from("invoices").delete().eq("id", invoice.id).eq("school_id", schoolId);
    return errResult(serverError(rollbackError ?? detailError, "Gagal menyimpan rincian tagihan."));
  }

  return okResult("Tagihan manual berhasil dibuat.");
}


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
