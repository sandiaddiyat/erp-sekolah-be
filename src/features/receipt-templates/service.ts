import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser, ReceiptTemplate } from "@/lib/types";
import type { SaveReceiptTemplateInput } from "./schema";
import { DEFAULT_RECEIPT_TEMPLATE, angkaTerbilang, renderReceiptTemplate, sanitizeReceiptCss, sanitizeReceiptHtml } from "./template";

export type ReceiptTemplateDeps = { supabase: SupabaseClient<Database> };

type ReceiptTemplateRow = Database["public"]["Tables"]["receipt_templates"]["Row"];
type ReceiptTemplateInsert = Database["public"]["Tables"]["receipt_templates"]["Insert"];

type ReceiptLine = { description: string; amount: number };
export type ReceiptViewModel = {
  paymentId: string;
  receiptNumber: string;
  source: "bill" | "invoice";
  school: { name: string; address: string; phone: string; logoUrl: string; city: string };
  student: { name: string; number: string; className: string };
  payment: { amount: number; date: string; method: string; note: string; officer: string };
  lines: ReceiptLine[];
  template: ReceiptTemplate;
};

function schoolIdOf(current: CurrentUser): string | null {
  return current.profile.school_id ?? null;
}

function toTemplate(row: ReceiptTemplateRow): ReceiptTemplate {
  return row;
}

function toRenderableTemplate(row: ReceiptTemplateRow): ReceiptTemplate {
  const requiredPlaceholders = [
    "{{nama_siswa}}",
    "{{tanggal_bayar}}",
    "{{metode_pembayaran}}",
    "{{nominal}}",
    "{{rincian_biaya}}",
    "{{nama_petugas}}",
  ];
  const hasDynamicValues = requiredPlaceholders.every((placeholder) => row.content_html.includes(placeholder));
  if (hasDynamicValues) return toTemplate(row);
  return {
    ...row,
    content_html: DEFAULT_RECEIPT_TEMPLATE.content_html,
    content_css: DEFAULT_RECEIPT_TEMPLATE.content_css,
  };
}

async function getStudentClassName(
  supabase: ReceiptTemplateDeps["supabase"],
  schoolId: string,
  studentId: string
): Promise<string> {
  const { data } = await supabase
    .from("student_enrollments")
    .select("classes!student_enrollments_class_tenant_fkey(name)")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as unknown as {
    classes: { name: string } | { name: string }[] | null;
  } | null;
  const classValue = Array.isArray(row?.classes) ? row.classes[0] : row?.classes;
  return classValue?.name ?? "";
}

export async function getReceiptTemplates(
  deps: ReceiptTemplateDeps,
  current: CurrentUser
): Promise<ReceiptTemplate[]> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return [];
  const { data, error } = await deps.supabase
    .from("receipt_templates")
    .select("*")
    .eq("school_id", schoolId)
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw new Error(serverError(error, "Gagal memuat template kuitansi."));
  return (data ?? []).map(toTemplate);
}

export async function getDefaultReceiptTemplate(
  deps: ReceiptTemplateDeps,
  current: CurrentUser
): Promise<ReceiptTemplate | null> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return null;
  const { data, error } = await deps.supabase
    .from("receipt_templates")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_default", true)
    .maybeSingle();
  if (error) throw new Error(serverError(error, "Gagal memuat template kuitansi."));
  return data ? toTemplate(data) : null;
}

export async function saveReceiptTemplateRecord(
  deps: ReceiptTemplateDeps,
  current: CurrentUser,
  input: SaveReceiptTemplateInput
): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  const supabase = deps.supabase;
  const payload: ReceiptTemplateInsert = {
    school_id: schoolId,
    name: input.name,
    content_html: sanitizeReceiptHtml(input.content_html),
    content_css: sanitizeReceiptCss(input.content_css ?? ""),
    is_default: input.is_default,
  };

  if (input.is_default) {
    const { error: resetError } = await supabase
      .from("receipt_templates")
      .update({ is_default: false })
      .eq("school_id", schoolId)
      .eq("is_default", true)
      .neq("id", input.id ?? "00000000-0000-0000-0000-000000000000");
    if (resetError) return errResult(serverError(resetError, "Gagal menetapkan template default."));
  }

  const result = input.id
    ? await supabase.from("receipt_templates").update(payload).eq("id", input.id).eq("school_id", schoolId)
    : await supabase.from("receipt_templates").insert(payload);
  if (result.error) return errResult(serverError(result.error, "Gagal menyimpan template kuitansi."));
  return okResult(input.id ? "Template kuitansi berhasil diperbarui." : "Template kuitansi berhasil ditambahkan.");
}

export async function deleteReceiptTemplateRecord(
  deps: ReceiptTemplateDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  const { data } = await deps.supabase.from("receipt_templates").select("is_default").eq("id", id).eq("school_id", schoolId).maybeSingle();
  if (!data) return errResult("Template kuitansi tidak ditemukan.");
  if (data.is_default) return errResult("Template default tidak dapat dihapus.");
  const { error } = await deps.supabase.from("receipt_templates").delete().eq("id", id).eq("school_id", schoolId);
  if (error) return errResult(serverError(error, "Gagal menghapus template kuitansi."));
  return okResult("Template kuitansi berhasil dihapus.");
}

export async function getReceiptRecord(
  deps: ReceiptTemplateDeps,
  current: CurrentUser,
  paymentId: string
): Promise<ReceiptViewModel | null> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return null;
  const supabase = deps.supabase;
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .eq("school_id", schoolId)
    .eq("status", "terverifikasi")
    .maybeSingle();
  if (paymentError || !payment) return null;

  const [{ data: school }, { data: template }, { data: officer }] = await Promise.all([
    supabase.from("schools").select("name,address,phone,logo_url").eq("id", schoolId).maybeSingle(),
    supabase.from("receipt_templates").select("*").eq("school_id", schoolId).eq("is_default", true).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", payment.dicatat_oleh).eq("school_id", schoolId).maybeSingle(),
  ]);
  if (!school || !template) return null;

  const base: ReceiptViewModel = {
    paymentId: payment.id,
    source: "bill",
    receiptNumber: `KW-${new Date(payment.diverifikasi_pada ?? payment.created_at).getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`,
    school: { name: school.name, address: school.address ?? "", phone: school.phone ?? "", logoUrl: school.logo_url ?? "", city: "" },
    payment: { amount: Number(payment.nominal), date: payment.diverifikasi_pada ?? payment.created_at, method: "", note: payment.catatan ?? "", officer: officer?.full_name ?? "Petugas Keuangan" },
    student: { name: "", number: "", className: "" },
    lines: [] as ReceiptLine[],
    template: toRenderableTemplate(template),
  };

  const { data: paymentItems } = await supabase
    .from("payment_invoices")
    .select("invoice_id, amount, invoices!payment_invoices_invoice_tenant_fkey(student_id, period_label)")
    .eq("payment_id", payment.id)
    .eq("school_id", schoolId);

  if (paymentItems && paymentItems.length > 0) {
    const firstItem = paymentItems[0];
    const firstInvoice = Array.isArray(firstItem.invoices) ? firstItem.invoices[0] : firstItem.invoices;
    const studentId = firstInvoice?.student_id;
    if (!studentId) return null;

    const [{ data: student }, className, { data: method }] = await Promise.all([
      supabase.from("students").select("nama_lengkap,nis,nisn").eq("id", studentId).eq("school_id", schoolId).maybeSingle(),
      getStudentClassName(supabase, schoolId, studentId),
      supabase.from("payment_methods").select("name").eq("id", payment.payment_method_id ?? "").eq("school_id", schoolId).maybeSingle(),
    ]);

    base.source = "invoice";
    base.student = { name: student?.nama_lengkap ?? "", number: student?.nis ?? student?.nisn ?? "", className };
    base.payment.method = method?.name ?? payment.metode ?? "Kas / Bank";
    base.lines = paymentItems.map((item) => {
      const invoice = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices;
      return { description: invoice?.period_label ?? "Tagihan", amount: Number(item.amount) };
    });
  } else if (payment.bill_id) {
    const { data: bill } = await supabase
      .from("bills")
      .select("student_id,deskripsi,nominal,diskon")
      .eq("id", payment.bill_id)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!bill) return null;
    const { data: student } = await supabase.from("students").select("nama_lengkap,nis,nisn").eq("id", bill.student_id).eq("school_id", schoolId).maybeSingle();
    const className = await getStudentClassName(supabase, schoolId, bill.student_id);
    base.source = "bill";
    base.student = { name: student?.nama_lengkap ?? "", number: student?.nis ?? student?.nisn ?? "", className };
    base.payment.method = payment.metode ?? "";
    base.lines = [{ description: bill.deskripsi, amount: Number(bill.nominal) - Number(bill.diskon ?? 0) }];
  } else {
    return null;
  }

  return base;
}

export async function getCombinedInvoicesReceiptRecord(
  deps: ReceiptTemplateDeps,
  current: CurrentUser,
  invoiceIds: string[]
): Promise<ReceiptViewModel | null> {
  const schoolId = schoolIdOf(current);
  const uniqueInvoiceIds = [...new Set(invoiceIds.filter(Boolean))];
  if (!schoolId || uniqueInvoiceIds.length === 0) return null;

  const supabase = deps.supabase;
  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id, student_id, period_label, total_amount, status")
    .in("id", uniqueInvoiceIds)
    .eq("school_id", schoolId);

  if (invoicesError || !invoices || invoices.length !== uniqueInvoiceIds.length) return null;
  const studentId = invoices[0].student_id;
  if (invoices.some((invoice) => invoice.student_id !== studentId || invoice.status !== "lunas")) return null;

  const [{ data: school }, { data: template }, { data: student }, className, { data: allocations }] = await Promise.all([
    supabase.from("schools").select("name,address,phone,logo_url").eq("id", schoolId).maybeSingle(),
    supabase.from("receipt_templates").select("*").eq("school_id", schoolId).eq("is_default", true).maybeSingle(),
    supabase.from("students").select("nama_lengkap,nis,nisn").eq("id", studentId).eq("school_id", schoolId).maybeSingle(),
    getStudentClassName(supabase, schoolId, studentId),
    supabase.from("payment_invoices").select("invoice_id, payment_id, created_at, payments!payment_invoices_payment_tenant_fkey(status, diverifikasi_pada, created_at, payment_method_id, metode)").in("invoice_id", uniqueInvoiceIds).eq("school_id", schoolId).order("created_at", { ascending: false }),
  ]);

  if (!school || !template) return null;
  const verifiedPayments = (allocations ?? []).filter((allocation) => {
    const payment = Array.isArray(allocation.payments) ? allocation.payments[0] : allocation.payments;
    return payment?.status === "terverifikasi";
  });
  const latest = verifiedPayments[0];
  const latestPayment = latest ? (Array.isArray(latest.payments) ? latest.payments[0] : latest.payments) : null;
  const totalAmount = invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount), 0);
  const receiptDate = latestPayment?.diverifikasi_pada ?? latestPayment?.created_at ?? new Date().toISOString();
  const methodId = latestPayment?.payment_method_id;
  const { data: method } = methodId
    ? await supabase.from("payment_methods").select("name").eq("id", methodId).eq("school_id", schoolId).maybeSingle()
    : { data: null };
  const receiptCode = `KW-${new Date(receiptDate).getFullYear()}-${Date.now().toString().slice(-6)}`;

  return {
    paymentId: uniqueInvoiceIds.join(","),
    source: "invoice",
    receiptNumber: receiptCode,
    school: { name: school.name, address: school.address ?? "", phone: school.phone ?? "", logoUrl: school.logo_url ?? "", city: "" },
    payment: { amount: totalAmount, date: receiptDate, method: method?.name ?? latestPayment?.metode ?? "Kas / Bank", note: "Pembayaran Tagihan Gabungan", officer: current.profile.full_name || "Petugas Keuangan" },
    student: { name: student?.nama_lengkap ?? "", number: student?.nis ?? student?.nisn ?? "", className },
    lines: invoices.map((invoice) => ({ description: invoice.period_label || "Tagihan", amount: Number(invoice.total_amount) })),
    template: toRenderableTemplate(template),
  };
}

export function receiptTemplateValues(receipt: ReceiptViewModel): Record<string, string> {
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(receipt.payment.date));
  const nominal = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(receipt.payment.amount);
  return {
    logo_url: receipt.school.logoUrl,
    nama_sekolah: receipt.school.name,
    alamat_sekolah: receipt.school.address,
    telepon_sekolah: receipt.school.phone,
    nomor_kuitansi: receipt.receiptNumber,
    nama_siswa: receipt.student.name,
    nomor_induk: receipt.student.number,
    kelas: receipt.student.className,
    tanggal_bayar: date,
    metode_pembayaran: receipt.payment.method,
    nominal,
    terbilang: angkaTerbilang(receipt.payment.amount),
    rincian_biaya: receipt.lines.map((line, index) => `<tr><td>${index + 1}</td><td>${escapeReceiptText(line.description)}</td><td>${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(line.amount)}</td></tr>`).join(""),
    nama_petugas: receipt.payment.officer,
    kota: receipt.school.city,
  };
}

export function renderReceipt(receipt: ReceiptViewModel) {
  return renderReceiptTemplate(receipt.template, receiptTemplateValues(receipt));
}

function escapeReceiptText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}
