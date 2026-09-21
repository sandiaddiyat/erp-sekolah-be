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
  const { invoice_id, payment_method_id, nominal, catatan } = payload;

  // Ambil invoice
  const invoiceResult = await supabase
    .from("invoices")
    .select("id, total_amount, status, school_id")
    .eq("id", invoice_id)
    .eq("school_id", schoolId)
    .single();

  if (invoiceResult.error || !invoiceResult.data) {
    return errResult("Tagihan tidak ditemukan.");
  }

  const invoice = invoiceResult.data as { id: string; total_amount: number; status: string };
  if (invoice.status === "batal") {
    return errResult("Tagihan ini sudah dibatalkan.");
  }
  if (invoice.status === "lunas") {
    return errResult("Tagihan ini sudah lunas.");
  }

  // Hitung total sudah dibayar
  const paymentsResult = await supabase
    .from("payments")
    .select("nominal")
    .eq("invoice_id", invoice_id)
    .eq("status", "terverifikasi");

  const totalTerverifikasi = ((paymentsResult.data ?? []) as { nominal: number }[])
    .reduce((sum, p) => sum + Number(p.nominal), 0);

  const sisa = Number(invoice.total_amount) - totalTerverifikasi;
  if (nominal > sisa) {
    return errResult(
      `Nominal melebihi sisa tagihan. Sisa: ${sisa.toLocaleString("id-ID")}.`
    );
  }

  // Catat pembayaran
  const { error: insertError } = await supabase.from("payments").insert({
    school_id: schoolId,
    invoice_id,
    nominal,
    catatan: catatan ?? null,
    status: "terverifikasi",
    dicatat_oleh: current.id,
    diverifikasi_oleh: current.id,
    diverifikasi_pada: new Date().toISOString(),
  } as never);

  if (insertError) return handleError(insertError, "Gagal mencatat pembayaran.");

  // Rekonsiliasi status invoice
  const totalBaru = totalTerverifikasi + nominal;
  const statusBaru = totalBaru >= Number(invoice.total_amount) ? "lunas" : "sebagian";

  await supabase
    .from("invoices")
    .update({ status: statusBaru })
    .eq("id", invoice_id);

  return okResult(
    statusBaru === "lunas"
      ? "Pembayaran berhasil. Tagihan telah lunas."
      : `Pembayaran berhasil. Sisa: ${(sisa - nominal).toLocaleString("id-ID")}.`
  );
}
