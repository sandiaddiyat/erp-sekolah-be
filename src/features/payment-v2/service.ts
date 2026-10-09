import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type {
  SavePaymentMethodInput,
  SaveBankAccountInput,
  RecordPaymentInput,
} from "./schema";

export type PaymentV2MutationsDeps = { supabase: SupabaseClient<Database> };

function handleError(error: unknown, fallback: string) {
  return errResult(serverError(error, fallback));
}

function ensureSchoolId(user: CurrentUser): string | null {
  return user.profile.school_id ?? null;
}

// ===== Payment Methods =====

export async function savePaymentMethodRecord(
  deps: PaymentV2MutationsDeps,
  current: CurrentUser,
  payload: SavePaymentMethodInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola metode pembayaran.");

  const { supabase } = deps;
  const { id, name, is_cash, is_gateway } = payload;

  if (id) {
    const { error } = await supabase
      .from("payment_methods")
      .update({ name, is_cash, is_gateway })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleError(error, "Gagal memperbarui metode pembayaran.");
    return okResult("Metode pembayaran berhasil diperbarui.");
  }

  const { error } = await supabase.from("payment_methods").insert({
    school_id: schoolId, name, is_cash, is_gateway,
  });
  if (error) return handleError(error, "Gagal menambahkan metode pembayaran.");
  return okResult("Metode pembayaran berhasil ditambahkan.");
}

export async function deletePaymentMethodRecord(
  deps: PaymentV2MutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola metode pembayaran.");

  const { error } = await deps.supabase
    .from("payment_methods")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleError(error, "Gagal menghapus metode pembayaran.");
  return okResult("Metode pembayaran berhasil dihapus.");
}

// ===== Bank Accounts =====

export async function saveBankAccountRecord(
  deps: PaymentV2MutationsDeps,
  current: CurrentUser,
  payload: SaveBankAccountInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola rekening.");

  const { supabase } = deps;
  const { id, bank_name, account_number, account_holder } = payload;

  if (id) {
    const { error } = await supabase
      .from("bank_accounts")
      .update({ bank_name, account_number, account_holder })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleError(error, "Gagal memperbarui rekening.");
    return okResult("Rekening berhasil diperbarui.");
  }

  const { error } = await supabase.from("bank_accounts").insert({
    school_id: schoolId, bank_name, account_number, account_holder,
  });
  if (error) return handleError(error, "Gagal menambahkan rekening.");
  return okResult("Rekening berhasil ditambahkan.");
}

export async function deleteBankAccountRecord(
  deps: PaymentV2MutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola rekening.");

  const { error } = await deps.supabase
    .from("bank_accounts")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleError(error, "Gagal menghapus rekening.");
  return okResult("Rekening berhasil dihapus.");
}

// ===== Reconciliation =====

export async function recordInvoicePayment(
  deps: PaymentV2MutationsDeps,
  current: CurrentUser,
  payload: RecordPaymentInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mencatat pembayaran.");

  const { supabase } = deps;
  const { invoice_ids, payment_method_id, nominal, catatan } = payload;

  if (!invoice_ids || invoice_ids.length === 0) {
    return errResult("Pilih minimal 1 tagihan.");
  }

  // 1. Ambil semua invoice
  const invoicesResult = await supabase
    .from("invoices")
    .select("id, student_id, total_amount, status")
    .in("id", invoice_ids)
    .eq("school_id", schoolId);

  if (invoicesResult.error || !invoicesResult.data || invoicesResult.data.length === 0) {
    return errResult("Tagihan tidak ditemukan.");
  }
  const invoices = invoicesResult.data;

  // Hapus pengecekan siswa yang sama agar bisa membayar beberapa tagihan untuk siswa berbeda sekaligus.

  // Pastikan tidak ada yang batal atau lunas
  if (invoices.some((inv) => inv.status === "batal" || inv.status === "lunas")) {
    return errResult("Terdapat tagihan yang sudah lunas atau dibatalkan.");
  }

  const methodResult = await supabase
    .from("payment_methods")
    .select("id")
    .eq("id", payment_method_id)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (methodResult.error || !methodResult.data) {
    return errResult("Metode pembayaran tidak valid.");
  }

  // 2. Hitung sisa per tagihan
  const paymentsResult = await supabase
    .from("payment_invoices")
    .select("invoice_id, amount, payments!inner(status)")
    .in("invoice_id", invoice_ids)
    .eq("school_id", schoolId)
    .eq("payments.status", "terverifikasi");

  if (paymentsResult.error) {
    return errResult("Gagal memuat riwayat pembayaran.");
  }

  const paidMap: Record<string, number> = {};
  for (const p of paymentsResult.data) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] ?? 0) + Number(p.amount);
  }

  let totalSisa = 0;
  const invoiceSisa = invoices.map((inv) => {
    const paid = paidMap[inv.id] ?? 0;
    const sisa = Number(inv.total_amount) - paid;
    totalSisa += sisa;
    return { ...inv, sisa };
  });

  if (nominal > totalSisa) {
    return errResult(
      `Nominal melebihi sisa tagihan. Sisa: ${totalSisa.toLocaleString("id-ID")}.`
    );
  }

  // 3. Catat pembayaran header (payments)
  const { data: insertedPayment, error: insertError } = await supabase.from("payments").insert({
    school_id: schoolId,
    payment_method_id,
    nominal,
    catatan: catatan ?? null,
    status: "terverifikasi",
    dicatat_oleh: current.id,
    diverifikasi_oleh: current.id,
    diverifikasi_pada: new Date().toISOString(),
  }).select("id").single();

  if (insertError || !insertedPayment) return handleError(insertError, "Gagal mencatat pembayaran.");

  // 4. Distribusi nominal ke tagihan dan simpan payment_invoices
  let sisaBayar = nominal;
  const paymentItems = [];
  const invoicesToUpdate = [];

  for (const inv of invoiceSisa) {
    if (sisaBayar <= 0) break;
    if (inv.sisa <= 0) continue;

    const alokasi = Math.min(sisaBayar, inv.sisa);
    sisaBayar -= alokasi;

    paymentItems.push({
      school_id: schoolId,
      payment_id: insertedPayment.id,
      invoice_id: inv.id,
      amount: alokasi,
    });

    const newPaid = (paidMap[inv.id] ?? 0) + alokasi;
    const newStatus = newPaid >= Number(inv.total_amount) ? "lunas" : "sebagian";
    
    invoicesToUpdate.push({ id: inv.id, status: newStatus });
  }

  const { error: itemsError } = await supabase.from("payment_invoices").insert(paymentItems);
  if (itemsError) {
    return handleError(itemsError, "Gagal mencatat rincian pembayaran.");
  }

  // 5. Update status tagihan
  for (const invUpdate of invoicesToUpdate) {
    await supabase.from("invoices").update({ status: invUpdate.status }).eq("id", invUpdate.id).eq("school_id", schoolId);
  }

  return okResult("Pembayaran berhasil dicatat.");
}
