import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Invoice, PaymentMethod, BankAccount, Siswa, InvoiceStatus } from "@/lib/types";

import { RekonsiliasiClient } from "./rekonsiliasi-client";

export const metadata = { title: "Rekonsiliasi Pembayaran" };

type InvoiceRow = Invoice & { siswa?: { nama_lengkap: string } | null; is_legacy_bill?: boolean };

export default async function RekonsiliasiPage() {
  const current = await requirePermission(PERMISSIONS.billingView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [invoicesResult, billsResult, paymentsResult, paymentInvoicesResult, methodsResult, banksResult, studentsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, students!invoices_student_tenant_fkey!inner(nama_lengkap)")
      .eq("school_id", schoolId)
      .order("due_date", { ascending: false }),
    supabase
      .from("bills")
      .select("*, students(nama_lengkap)")
      .eq("school_id", schoolId)
      .order("jatuh_tempo", { ascending: false }),
    supabase
      .from("payments")
       .select("id, invoice_id, bill_id, nominal, status, created_at")
      .eq("school_id", schoolId)
      .eq("status", "terverifikasi"),
    supabase
      .from("payment_invoices")
      .select("payment_id, invoice_id, amount, created_at")
      .eq("school_id", schoolId),
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
    billsResult.error ||
    paymentsResult.error ||
    paymentInvoicesResult.error ||
    methodsResult.error ||
    banksResult.error ||
    studentsResult.error
  ) {
    console.error("[rekonsiliasi]", invoicesResult.error ?? billsResult.error ?? paymentsResult.error ?? paymentInvoicesResult.error ?? methodsResult.error ?? banksResult.error ?? studentsResult.error);
    return <DataError message="Gagal memuat data rekonsiliasi." />;
  }

  const rawInvoices = (invoicesResult.data ?? []) as unknown as InvoiceRow[];
  const mappedBills = (billsResult.data ?? []).map((b: any) => ({
    id: b.id,
    school_id: b.school_id,
    student_id: b.student_id,
    guardian_id: null,
    academic_year_id: null,
    period_label: b.deskripsi,
    issue_date: b.created_at,
    due_date: b.jatuh_tempo,
    total_amount: Number(b.nominal) - Number(b.diskon || 0),
    status: b.status,
    created_at: b.created_at,
    updated_at: b.updated_at,
    students: b.students,
    is_legacy_bill: true,
  })) as unknown as InvoiceRow[];

  const invoices = [...rawInvoices, ...mappedBills];

  const paymentsRaw = (paymentsResult.data ?? []) as { id: string; invoice_id: string | null; bill_id: string | null; nominal: number; status: string; created_at: string }[];
  const paymentInvoices = (paymentInvoicesResult.data ?? []) as { payment_id: string; invoice_id: string; amount: number; created_at: string }[];

  const methods = (methodsResult.data ?? []) as PaymentMethod[];
  const banks = (banksResult.data ?? []) as BankAccount[];
  const students = (studentsResult.data ?? []) as unknown as Siswa[];

  const validPaymentIds = new Set(paymentsRaw.map(p => p.id));
  const paidByInvoice = new Map<string, number>();
  const latestPaymentByInvoice = new Map<string, { id: string; created_at: string }>();

  // Tagihan Manual / Bills
  for (const p of paymentsRaw) {
    if (p.bill_id) {
      paidByInvoice.set(p.bill_id, (paidByInvoice.get(p.bill_id) ?? 0) + Number(p.nominal));
      const previous = latestPaymentByInvoice.get(p.bill_id);
      if (!previous || previous.created_at < p.created_at) {
        latestPaymentByInvoice.set(p.bill_id, { id: p.id, created_at: p.created_at });
      }
    }
  }

  // Tagihan Otomatis / Invoices
  for (const pi of paymentInvoices) {
    if (!validPaymentIds.has(pi.payment_id)) continue; // ignore unverified payments
    const key = pi.invoice_id;
    paidByInvoice.set(key, (paidByInvoice.get(key) ?? 0) + Number(pi.amount));
    const previous = latestPaymentByInvoice.get(key);
    if (!previous || previous.created_at < pi.created_at) {
      latestPaymentByInvoice.set(key, { id: pi.payment_id, created_at: pi.created_at });
    }
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
      latestPaymentByInvoice={Object.fromEntries([...latestPaymentByInvoice].map(([invoiceId, payment]) => [invoiceId, payment.id]))}
      methods={methods}
      banks={banks}
      students={students}
      summary={summary}
      canManage={can(current.permissions, PERMISSIONS.billingManage, current.isSuperAdmin)}
    />
  );
}
