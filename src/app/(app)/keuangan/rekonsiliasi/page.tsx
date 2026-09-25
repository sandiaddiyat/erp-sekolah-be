import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, PaymentMethod, BankAccount, Siswa, InvoiceStatus } from "@/lib/types";

import { RekonsiliasiClient } from "./rekonsiliasi-client";

export const metadata = { title: "Rekonsiliasi Pembayaran" };

type InvoiceRow = Invoice & { siswa?: { nama_lengkap: string } | null };

export default async function RekonsiliasiPage() {
  const current = await requirePermission(PERMISSIONS.billingView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [invoicesResult, paymentsResult, methodsResult, banksResult, studentsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, students!inner(nama_lengkap)")
      .eq("school_id", schoolId)
      .order("due_date", { ascending: false }),
    supabase
      .from("payments")
      .select("invoice_id, nominal, status")
      .eq("school_id", schoolId)
      .eq("status", "terverifikasi"),
    supabase
      .from("payment_methods")
      .select("*")
      .eq("school_id", schoolId)
      .order("name"),
    supabase
      .from("bank_accounts")
      .select("*")
      .eq("school_id", schoolId)
      .order("bank_name"),
    supabase
      .from("students")
      .select("id, nama_lengkap")
      .eq("school_id", schoolId)
      .order("nama_lengkap"),
  ]);

  if (
    invoicesResult.error ||
    paymentsResult.error ||
    methodsResult.error ||
    banksResult.error ||
    studentsResult.error
  ) {
    return <DataError message="Gagal memuat data rekonsiliasi." />;
  }

  const invoices = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
  const payments = (
    (paymentsResult.data ?? []) as { invoice_id: string | null; nominal: number; status: string }[]
  ).filter(
    (payment): payment is { invoice_id: string; nominal: number; status: string } =>
      typeof payment.invoice_id === "string"
  );
  const methods = (methodsResult.data ?? []) as PaymentMethod[];
  const banks = (banksResult.data ?? []) as BankAccount[];
  const students = (studentsResult.data ?? []) as unknown as Siswa[];

  const paidByInvoice = new Map<string, number>();
  for (const p of payments) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.nominal));
  }

  const summary: Record<InvoiceStatus, { count: number; total: number }> = {
    belum_bayar: { count: 0, total: 0 },
    sebagian: { count: 0, total: 0 },
    lunas: { count: 0, total: 0 },
    batal: { count: 0, total: 0 },
  };

  for (const inv of invoices) {
    const status = inv.status as InvoiceStatus;
    summary[status].count++;
    summary[status].total += Number(inv.total_amount);
  }

  return (
    <RekonsiliasiClient
      invoices={invoices}
      paidByInvoice={Object.fromEntries(paidByInvoice)}
      methods={methods}
      banks={banks}
      students={students}
      summary={summary}
      canManage={can(current.permissions, PERMISSIONS.billingManage, current.isSuperAdmin)}
    />
  );
}
