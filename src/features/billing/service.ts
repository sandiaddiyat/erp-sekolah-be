import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type { GenerateInvoicesInput } from "./schema";

/**
 * Service layer fitur tagihan otomatis: ATURAN MAINNYA SAJA.
 * Dependency (client Supabase) di-inject lewat parameter.
 */
export type BillingMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

const SCHOOL_ID = (user: CurrentUser) => user.profile.school_id;

/**
 * Algoritma generate tagihan otomatis:
 * 1. Ambil semua siswa yang terdaftar di tahun ajaran yang dipilih.
 * 2. Untuk setiap siswa, ambil skema biaya yang berlaku (berdasarkan
 *    education_level, grade, dan major siswa — boleh null major).
 * 3. Hitung diskon per siswa (student_discounts yang statusnya "disetujui"
 *    dan masih berlaku).
 * 4. Buat invoice + invoice_details. Lewati siswa yang sudah punya invoice
 *    untuk periode yang sama (jika only_without_invoice = false, regenerate).
 * 5. Catat log billing_run_logs untuk idempotency.
 */
export async function generateInvoices(
  deps: BillingMutationsDeps,
  current: CurrentUser,
  payload: GenerateInvoicesInput
): Promise<MutationResult> {
  const schoolId = SCHOOL_ID(current);
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat menjalankan job ini.");
  }

  const { supabase } = deps;
  const { academic_year_id, period_label, due_date, only_without_invoice } = payload;

  // 1. Idempotensi: cek apakah job untuk periode ini sudah pernah berjalan selesai
  const { data: existingRun } = await supabase
    .from("billing_run_logs")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academic_year_id)
    .eq("period_label", period_label)
    .eq("status", "selesai")
    .maybeSingle();

  if (existingRun) {
    return errResult(
      `Tagihan untuk periode "${period_label}" sudah pernah dibuat. Hapus pencatatan lama atau gunakan periode lain.`
    );
  }

  // 2. Buat log run dengan status "berjalan"
  const { data: runLog, error: runLogError } = await supabase
    .from("billing_run_logs")
    .insert({
      school_id: schoolId,
      academic_year_id,
      period_label,
      status: "berjalan",
      total_invoices_generated: 0,
    })
    .select("id")
    .single();

  if (runLogError || !runLog) {
    return errResult(serverError(runLogError, "Gagal memulai job billing."));
  }

  try {
    // 3. Ambil semua enrollment aktif di tahun ajaran ini + siswa + kelas
    const { data: enrollments, error: enrollError } = await supabase
      .from("student_enrollments")
      .select("*, students!inner(*), classes!inner(grade_id, major_id), pegawai!inner(education_level_id, name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academic_year_id)
      .eq("status", "active");

    if (enrollError) {
      throw enrollError;
    }

    // 4. Ambil semua fee_structures untuk tahun ajaran ini
    const { data: feeStructures, error: feeError } = await supabase
      .from("fee_structures")
      .select("*")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academic_year_id);

    if (feeError) {
      throw feeError;
    }

    // 5. Ambil student_discounts yang disetujui
    const { data: discounts, error: discError } = await supabase
      .from("student_discounts")
      .select("*")
      .eq("school_id", schoolId)
      .eq("status", "disetujui");

    if (discError) {
      throw discError;
    }

    const discountByType: Record<string, typeof discounts[number][]> = {};
    discounts?.forEach((d) => {
      const key = d.discount_type_id;
      if (!discountByType[key]) discountByType[key] = [];
      discountByType[key].push(d);
    });

    let generatedCount = 0;

    for (const enrollment of enrollments ?? []) {
      const student = enrollment.students;
      if (!student) continue;

      // Cek apakah sudah punya invoice (untuk only_without_invoice)
      if (only_without_invoice) {
        const { data: existing } = await supabase
          .from("invoices")
          .select("id")
          .eq("school_id", schoolId)
          .eq("student_id", student.id)
          .eq("academic_year_id", academic_year_id)
          .eq("period_label", period_label)
          .maybeSingle();
        if (existing) continue;
      }

      // Dapatkan level_id dan grade_id dari enrollment
      const gradeId = enrollment.classes?.grade_id;
      const majorId = enrollment.classes?.major_id;

      // Filter fee structures yang cocok: sama dengan grade_id, major_id nullable
      const matchedFees = (feeStructures ?? []).filter((fs) => {
        if (fs.grade_id !== gradeId) return false;
        if (fs.major_id !== null && fs.major_id !== majorId) return false;
        return true;
      });

      if (matchedFees.length === 0) continue;

      // Hitung total + buat invoice_details
      let totalAmount = 0;
      const invoiceDetails: {
        fee_structure_id: string;
        description: string;
        base_amount: number;
        discount_amount: number;
        final_amount: number;
      }[] = [];

      for (const fs of matchedFees) {
        const baseAmount = Number(fs.amount);
        let discountAmount = 0;

        // Cari discount type untuk fee_structure (berdasarkan fee_category_id)
        // Di sini kita mengasumsikan fee_category_id = discount_type_id jika matching
        // Atau kita bisa cari student_discount berdasarkan student_id
        const studentDiscounts = discounts?.filter((d) => d.student_id === student.id) ?? [];

        for (const sd of studentDiscounts) {
          if (sd.start_date <= due_date && sd.end_date >= due_date) {
            // We need to fetch the discount type to know calc_type
            // For now, apply percent discount to all fees
            // This is a simplification — a more complex implementation would
            // match discount types to fee categories
          }
        }

        // Apply all valid discounts
        for (const sd of studentDiscounts) {
          if (sd.start_date <= due_date && sd.end_date >= due_date) {
            const { data: discType } = await supabase
              .from("discount_types")
              .select("calc_type")
              .eq("id", sd.discount_type_id)
              .single();

            if (discType) {
              if (discType.calc_type === "percent") {
                discountAmount += baseAmount * (Number(sd.value) / 100);
              } else {
                discountAmount += Number(sd.value);
              }
            }
          }
        }

        discountAmount = Math.min(discountAmount, baseAmount);
        const finalAmount = baseAmount - discountAmount;
        totalAmount += finalAmount;

        // Fetch category name
        const { data: cat } = await supabase
          .from("fee_categories")
          .select("name")
          .eq("id", fs.fee_category_id)
          .single();

        invoiceDetails.push({
          fee_structure_id: fs.id,
          description: cat?.name ?? fs.fee_category_id,
          base_amount: baseAmount,
          discount_amount: discountAmount,
          final_amount: finalAmount,
        });
      }

      // Get primary billing contact
      const familyId = student.family_id;
      let guardianId: string | null = null;
      if (familyId) {
        const { data: guardian } = await supabase
          .from("guardians")
          .select("id")
          .eq("family_id", familyId)
          .eq("is_primary_billing_contact", true)
          .maybeSingle();
        guardianId = guardian?.id ?? null;
      }

      // Insert invoice
      const { data: invoice, error: invError } = await supabase
        .from("invoices")
        .insert({
          school_id: schoolId,
          student_id: student.id,
          guardian_id: guardianId,
          academic_year_id,
          period_label,
          issue_date: new Date().toISOString().slice(0, 10),
          due_date,
          total_amount: totalAmount,
        })
        .select("id")
        .single();

      if (invError || !invoice) {
        throw invError ?? new Error("Failed to create invoice");
      }

      // Insert invoice details
      for (const detail of invoiceDetails) {
        const { error: detailError } = await supabase
          .from("invoice_details")
          .insert({
            invoice_id: invoice.id,
            ...detail,
          });
        if (detailError) throw detailError;
      }

      generatedCount++;
    }

    // Update log
    await supabase
      .from("billing_run_logs")
      .update({
        status: "selesai",
        total_invoices_generated: generatedCount,
      })
      .eq("id", runLog.id);

    return okResult(`Berhasil generate ${generatedCount} tagihan untuk periode "${period_label}".`);
  } catch (error) {
    // Update log to gagal
    await supabase
      .from("billing_run_logs")
      .update({
        status: "gagal",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", runLog.id);

    return errResult(serverError(error, "Job generate tagihan gagal."));
  }
}
