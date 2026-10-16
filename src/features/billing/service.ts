import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type { GenerateInvoicesInput } from "./schema";

export type BillingMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

const SCHOOL_ID = (user: CurrentUser) => user.profile.school_id;

export type AcademicMonth = {
  year: number;
  month: number;
  monthLabel: string;
};

export type BillingPeriod = {
  label: string;
  dueDate: string;
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function getAcademicMonths(startDateStr: string, endDateStr: string): AcademicMonth[] {
  const start = new Date(`${startDateStr}T00:00:00`);
  const end = new Date(`${endDateStr}T00:00:00`);
  const months: AcademicMonth[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= last) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1;
    months.push({ year, month, monthLabel: `${MONTH_NAMES[month - 1]} ${year}` });
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

export function calculateDueDate(year: number, month: number, dueDay: number | null): string {
  const day = Math.min(Math.max(dueDay ?? 10, 1), 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function buildBillingPeriods(
  billingCycle: string,
  academicYearName: string,
  months: AcademicMonth[],
  dueDay: number | null,
  dueDate: string | null,
  customDueDate: string | null,
): BillingPeriod[] {
  if (billingCycle === "bulanan") {
    return months.map((month) => ({
      label: month.monthLabel,
      dueDate: customDueDate ?? calculateDueDate(month.year, month.month, dueDay),
    }));
  }

  if (billingCycle === "ganjil" || billingCycle === "genap") {
    const semester = billingCycle === "ganjil" ? "Ganjil" : "Genap";
    const month = billingCycle === "ganjil" ? months[0] : months[6] ?? months[months.length - 1];
    if (!month) return [];
    return [{
      label: `${semester} ${academicYearName}`,
      dueDate: customDueDate ?? dueDate ?? calculateDueDate(month.year, month.month, dueDay),
    }];
  }

  if (billingCycle === "semester") {
    const month = months[0];
    if (!month) return [];
    return [{
      label: `Ganjil ${academicYearName}`,
      dueDate: customDueDate ?? dueDate ?? calculateDueDate(month.year, month.month, dueDay),
    }];
  }

  const firstMonth = months[0];
  if (!firstMonth) return [];
  return [{
    label: `${billingCycle === "tahunan" ? "Tahunan" : "Sekali"} ${academicYearName}`,
    dueDate: customDueDate ?? dueDate ?? calculateDueDate(firstMonth.year, firstMonth.month, dueDay),
  }];
}

type DiscountType = { calc_type: string };
type StudentDiscount = { student_id: string; discount_type_id: string; value: number; start_date: string; end_date: string };

type InvoiceDetailInput = Database["public"]["Tables"]["invoice_details"]["Insert"];

type FeeStructure = Database["public"]["Tables"]["fee_structures"]["Row"];
type FeeCategory = { id: string; name: string; billing_cycle: string };

export async function generateInvoices(
  deps: BillingMutationsDeps,
  current: CurrentUser,
  payload: GenerateInvoicesInput,
): Promise<MutationResult> {
  const schoolId = SCHOOL_ID(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat menjalankan job ini.");

  const { supabase } = deps;
  const { academic_year_id, mode, period_label, custom_due_date, only_without_invoice, fee_category_ids } = payload;
  const { data: academicYear, error: yearError } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date")
    .eq("id", academic_year_id)
    .eq("school_id", schoolId)
    .single();
  if (yearError || !academicYear) return errResult("Tahun ajaran tidak ditemukan.");

  const months = getAcademicMonths(academicYear.start_date, academicYear.end_date);
  if (months.length === 0) return errResult("Rentang tahun ajaran tidak valid.");

  const runLabel = mode === "single_period" ? period_label?.trim() : `Tahun Ajaran ${academicYear.name}`;
  if (mode === "single_period" && !runLabel) return errResult("Periode wajib diisi untuk mode satu periode.");

  const { data: existingRun } = await supabase
    .from("billing_run_logs")
    .select("id, status")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academic_year_id)
    .eq("period_label", runLabel ?? "")
    .maybeSingle();
  if (existingRun?.status === "berjalan") return errResult(`Pembuatan tagihan untuk "${runLabel}" sedang berjalan.`);
  if (existingRun) await supabase.from("billing_run_logs").delete().eq("id", existingRun.id).eq("school_id", schoolId);

  const { data: runLog, error: runLogError } = await supabase
    .from("billing_run_logs")
    .insert({ school_id: schoolId, academic_year_id, period_label: runLabel ?? "", status: "berjalan", total_invoices_generated: 0 })
    .select("id")
    .single();
  if (runLogError || !runLog) return errResult(serverError(runLogError, "Gagal memulai job billing."));

  try {
    const { data: enrollments, error: enrollError } = await supabase
      .from("student_enrollments")
      .select("*, students:students!student_enrollments_student_tenant_fkey!inner(*), classes:classes!student_enrollments_class_tenant_fkey!inner(grade_id, major_id)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academic_year_id)
      .eq("status", "active");
    if (enrollError) throw enrollError;

    const { data: feeStructures, error: feeError } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academic_year_id)
      .in("fee_category_id", fee_category_ids);
    if (feeError) throw feeError;

    const { data: categories, error: categoryError } = await supabase
      .from("fee_categories")
      .select("id, name, billing_cycle")
      .eq("school_id", schoolId)
      .in("id", fee_category_ids);
    if (categoryError) throw categoryError;
    const categoryById = new Map((categories ?? []).map((category) => [category.id, category as FeeCategory]));

    const { data: discounts, error: discountError } = await supabase
      .from("student_discounts")
      .select("student_id, discount_type_id, value, start_date, end_date")
      .eq("school_id", schoolId)
      .eq("status", "disetujui");
    if (discountError) throw discountError;

    const { data: discountTypes, error: discountTypeError } = await supabase
      .from("discount_types")
      .select("id, calc_type")
      .eq("school_id", schoolId);
    if (discountTypeError) throw discountTypeError;
    const discountTypeById = new Map((discountTypes ?? []).map((type) => [type.id, type as DiscountType]));

    let generatedCount = 0;
    for (const enrollment of enrollments ?? []) {
      const student = enrollment.students;
      if (!student) continue;
      const matchedFees = (feeStructures ?? []).filter((fee) => {
        if (fee.grade_id !== enrollment.classes?.grade_id) return false;
        if (fee.major_id !== null && fee.major_id !== enrollment.classes?.major_id) return false;
        return true;
      }) as FeeStructure[];
      const grouped = new Map<string, { dueDate: string; fees: FeeStructure[] }>();

      for (const fee of matchedFees) {
        const category = categoryById.get(fee.fee_category_id);
        if (!category) continue;
        const periods = buildBillingPeriods(category.billing_cycle, academicYear.name, months, fee.due_day, fee.due_date, custom_due_date);
        for (const period of mode === "single_period" ? periods.filter((item) => item.label === period_label?.trim() || item.label.includes(period_label?.trim() ?? "")) : periods) {
          const existing = grouped.get(period.label) ?? { dueDate: period.dueDate, fees: [] };
          existing.fees.push(fee);
          if (custom_due_date) existing.dueDate = custom_due_date;
          grouped.set(period.label, existing);
        }
      }

      const familyId = student.family_id;
      let guardianId: string | null = null;
      if (familyId) {
        const { data: guardian } = await supabase.from("guardians").select("id").eq("school_id", schoolId).eq("family_id", familyId).eq("is_primary_billing_contact", true).maybeSingle();
        guardianId = guardian?.id ?? null;
      }

      for (const [period, group] of grouped) {
        if (only_without_invoice) {
          const { data: existing } = await supabase.from("invoices").select("id").eq("school_id", schoolId).eq("student_id", student.id).eq("academic_year_id", academic_year_id).eq("period_label", period).maybeSingle();
          if (existing) continue;
        }

        const detailInputs: InvoiceDetailInput[] = [];
        let totalAmount = 0;
        for (const fee of group.fees) {
          const baseAmount = Number(fee.amount);
          const studentDiscounts = ((discounts ?? []) as StudentDiscount[]).filter((discount) => discount.student_id === student.id && discount.start_date <= group.dueDate && discount.end_date >= group.dueDate);
          let discountAmount = 0;
          for (const discount of studentDiscounts) {
            const type = discountTypeById.get(discount.discount_type_id);
            if (type?.calc_type === "percent") discountAmount += baseAmount * (Number(discount.value) / 100);
            if (type?.calc_type === "fixed") discountAmount += Number(discount.value);
          }
          discountAmount = Math.min(discountAmount, baseAmount);
          const finalAmount = baseAmount - discountAmount;
          totalAmount += finalAmount;
          detailInputs.push({ school_id: schoolId, invoice_id: "", fee_structure_id: fee.id, description: categoryById.get(fee.fee_category_id)?.name ?? fee.fee_category_id, base_amount: baseAmount, discount_amount: discountAmount, final_amount: finalAmount });
        }

        const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({ school_id: schoolId, student_id: student.id, guardian_id: guardianId, academic_year_id, period_label: period, issue_date: new Date().toISOString().slice(0, 10), due_date: group.dueDate, total_amount: totalAmount }).select("id").single();
        if (invoiceError || !invoice) throw invoiceError ?? new Error("Gagal membuat tagihan.");
        const details = detailInputs.map((detail) => ({ ...detail, invoice_id: invoice.id }));
        const { error: detailError } = await supabase.from("invoice_details").insert(details);
        if (detailError) throw detailError;
        generatedCount++;
      }
    }

    await supabase.from("billing_run_logs").update({ status: "selesai", total_invoices_generated: generatedCount }).eq("id", runLog.id).eq("school_id", schoolId);
    return okResult(`Berhasil generate ${generatedCount} tagihan untuk ${runLabel}.`);
  } catch (error) {
    await supabase.from("billing_run_logs").update({ status: "gagal", error_message: error instanceof Error ? error.message : "Unknown error" }).eq("id", runLog.id).eq("school_id", schoolId);
    return errResult(serverError(error, `Job generate tagihan gagal: ${error instanceof Error ? error.message : JSON.stringify(error)}`));
  }
}

export async function deleteInvoice(
  deps: BillingMutationsDeps,
  current: CurrentUser,
  payload: { id: string },
): Promise<MutationResult> {
  const schoolId = SCHOOL_ID(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat menjalankan aksi ini.");
  const { data: invoice } = await deps.supabase.from("invoices").select("status").eq("id", payload.id).eq("school_id", schoolId).single();
  if (!invoice) return errResult("Tagihan tidak ditemukan.");
  if (invoice.status !== "belum_bayar") return errResult("Tidak dapat menghapus tagihan yang sudah memiliki riwayat pembayaran.");
  const { error } = await deps.supabase.from("invoices").delete().eq("id", payload.id).eq("school_id", schoolId);
  return error ? errResult(serverError(error, "Gagal menghapus tagihan.")) : okResult("Tagihan berhasil dihapus.");
}

export async function bulkDeleteInvoice(
  deps: BillingMutationsDeps,
  current: CurrentUser,
  payload: { ids: string[] },
): Promise<MutationResult> {
  const schoolId = SCHOOL_ID(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat menjalankan aksi ini.");
  if (!payload.ids.length) return errResult("Tidak ada tagihan yang dipilih.");
  const { data: invoices } = await deps.supabase.from("invoices").select("status").in("id", payload.ids).eq("school_id", schoolId);
  if (!invoices?.length) return errResult("Tagihan tidak ditemukan.");
  if (invoices.some((invoice) => invoice.status !== "belum_bayar")) return errResult("Tidak dapat menghapus tagihan karena ada yang sudah memiliki riwayat pembayaran.");
  const { error } = await deps.supabase.from("invoices").delete().in("id", payload.ids).eq("school_id", schoolId);
  return error ? errResult(serverError(error, "Gagal menghapus tagihan dalam jumlah banyak.")) : okResult(`${payload.ids.length} tagihan berhasil dihapus.`);
}
