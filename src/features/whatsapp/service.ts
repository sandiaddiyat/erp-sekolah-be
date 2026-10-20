import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { CurrentUser, WhatsAppSettings } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import { sendViaWhatsAppGateway } from "./gateway-client";
import type { SaveWhatsAppSettingsInput } from "./schema";
import type { SendWhatsAppMessageParams } from "./types";

export type WhatsAppDeps = { supabase: SupabaseClient<Database> };

type TemplateVariables = Record<string, string | number | null | undefined>;
type StudentRow = { id: string; nama_lengkap: string; no_telp_wali: string | null; telepon_wali?: string | null; nama_wali: string | null };
type PaymentItem = { invoice_id: string; amount: number; invoices: { student_id: string; period_label: string } | { student_id: string; period_label: string }[] | null };

const DEFAULT_INVOICE_TEMPLATE = "Yth. Orang tua dari {{nama_siswa}}, tagihan {{nama_tagihan}} sebesar {{nominal}} telah terbit dengan jatuh tempo {{jatuh_tempo}}. Pembayaran dapat ditransfer ke {{rekening_tujuan}}. Terima kasih.";
const DEFAULT_RECEIPT_TEMPLATE = "Alhamdulillah, pembayaran {{nama_tagihan}} an. {{nama_siswa}} sebesar {{nominal}} telah kami terima pada {{tanggal_bayar}}. Unduh kuitansi resmi Anda di: {{link_kuitansi}}. Terima kasih.";

export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  }
  return "http://localhost:3000";
}

function schoolIdOf(current: CurrentUser): string | null {
  return current.profile.school_id ?? null;
}

export async function getWhatsAppSettings(deps: WhatsAppDeps, schoolId: string): Promise<WhatsAppSettings | null> {
  if (!schoolId) return null;
  const { data, error } = await deps.supabase.from("whatsapp_settings").select("*").eq("school_id", schoolId).maybeSingle();
  if (error) {
    console.error("[whatsapp/service] getWhatsAppSettings error:", error);
    return null;
  }
  return data as WhatsAppSettings | null;
}

export function formatTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (placeholder, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export async function saveWhatsAppSettingsRecord(deps: WhatsAppDeps, current: CurrentUser, input: SaveWhatsAppSettingsInput): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  const { error } = await deps.supabase.from("whatsapp_settings").upsert({
    school_id: schoolId,
    provider: input.provider,
    api_token: input.api_token,
    sender_number: input.sender_number || null,
    is_active: input.is_active,
    auto_send_invoice: input.auto_send_invoice,
    auto_send_receipt: input.auto_send_receipt,
    template_invoice: input.template_invoice || DEFAULT_INVOICE_TEMPLATE,
    template_receipt: input.template_receipt || DEFAULT_RECEIPT_TEMPLATE,
  }, { onConflict: "school_id" });
  if (error) return errResult("Gagal menyimpan pengaturan WhatsApp.");
  return okResult("Pengaturan WhatsApp berhasil disimpan.");
}

export async function createReceiptAccessToken(deps: WhatsAppDeps, paymentId: string, schoolId: string): Promise<string | null> {
  const { data, error } = await deps.supabase.from("receipt_access_tokens").insert({ payment_id: paymentId, school_id: schoolId }).select("token").single();
  if (error || !data) return null;
  const baseUrl = getAppBaseUrl();
  return `${baseUrl}/kuitansi/v/${data.token}`;
}

export async function sendWhatsAppNotification(deps: WhatsAppDeps, params: SendWhatsAppMessageParams): Promise<MutationResult> {
  const settings = await getWhatsAppSettings(deps, params.schoolId);
  if (!settings || !settings.is_active || !settings.api_token) return errResult("Layanan WhatsApp belum aktif atau token belum diatur.");
  const baseLog = {
    school_id: params.schoolId,
    recipient_phone: params.phone,
    recipient_name: params.recipientName ?? null,
    message_type: params.messageType,
    content: params.message,
    invoice_id: params.invoiceId ?? null,
    payment_id: params.paymentId ?? null,
    student_id: params.studentId ?? null,
  } as const;
  const { data: log, error: logError } = await deps.supabase.from("whatsapp_logs").insert({ ...baseLog, status: "pending" }).select("id").single();
  if (logError || !log) return errResult("Gagal mencatat antrean notifikasi WhatsApp.");
  try {
    const response = await sendViaWhatsAppGateway(settings.provider, settings.api_token, params.phone, params.message);
    const sent = response.ok && response.status >= 200 && response.status < 300;
    await deps.supabase.from("whatsapp_logs").update({ status: sent ? "sent" : "failed", response_payload: response.payload as never, error_message: sent ? null : `Provider mengembalikan HTTP ${response.status}` }).eq("id", log.id).eq("school_id", params.schoolId);
    return sent ? okResult("Pesan WhatsApp berhasil dikirim.") : errResult(`Pesan WhatsApp gagal dikirim (HTTP ${response.status}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan jaringan.";
    await deps.supabase.from("whatsapp_logs").update({ status: "failed", error_message: message }).eq("id", log.id).eq("school_id", params.schoolId);
    return errResult("Pesan WhatsApp gagal dikirim.");
  }
}

export async function triggerReceiptNotification(deps: WhatsAppDeps, paymentId: string, schoolId: string): Promise<MutationResult> {
  const settings = await getWhatsAppSettings(deps, schoolId);
  if (!settings?.is_active || !settings.auto_send_receipt) return okResult("Notifikasi kuitansi tidak aktif.");
  const { data: payment } = await deps.supabase.from("payments").select("id, nominal, diverifikasi_pada, created_at, payment_method_id, catatan").eq("id", paymentId).eq("school_id", schoolId).eq("status", "terverifikasi").maybeSingle();
  if (!payment) return errResult("Pembayaran tidak ditemukan.");
  const { data: items } = await deps.supabase.from("payment_invoices").select("invoice_id, amount, invoices!payment_invoices_invoice_tenant_fkey(student_id, period_label)").eq("payment_id", paymentId).eq("school_id", schoolId);
  const paymentItems = (items ?? []) as unknown as PaymentItem[];
  const first = paymentItems[0];
  const invoice = Array.isArray(first?.invoices) ? first.invoices[0] : first?.invoices;
  let student: StudentRow | null = null;
  let name = "Pembayaran";
  let invoiceId: string | undefined;
  if (invoice?.student_id) {
    invoiceId = first.invoice_id;
    const result = await deps.supabase
      .from("students")
      .select("id, nama_lengkap, no_telp_wali, telepon_wali, nama_wali")
      .eq("id", invoice.student_id)
      .eq("school_id", schoolId)
      .maybeSingle();
    student = result.data as StudentRow | null;
    name = paymentItems.map((item) => { const value = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices; return value?.period_label; }).filter(Boolean).join(", ") || name;
  } else if (payment.payment_method_id) {
    return errResult("Relasi tagihan pada pembayaran tidak ditemukan.");
  }
  const parentPhone = student?.no_telp_wali || student?.telepon_wali;
  if (!parentPhone) return okResult("Nomor WhatsApp wali belum terdaftar.");
  const receiptUrl = await createReceiptAccessToken(deps, paymentId, schoolId);
  if (!receiptUrl) return errResult("Gagal membuat tautan kuitansi.");
  const { data: method } = await deps.supabase.from("payment_methods").select("name").eq("id", payment.payment_method_id ?? "").eq("school_id", schoolId).maybeSingle();
  const paidAt = payment.diverifikasi_pada ?? payment.created_at;
  const message = formatTemplate(settings.template_receipt, {
    nama_siswa: student.nama_lengkap,
    nama_tagihan: name,
    nominal: formatRupiah(Number(payment.nominal)),
    tanggal_bayar: new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(paidAt)),
    metode_pembayaran: method?.name ?? "Kas / Bank",
    link_kuitansi: receiptUrl,
  });
  return sendWhatsAppNotification(deps, { schoolId, phone: parentPhone, recipientName: student.nama_wali ?? student.nama_lengkap, message, messageType: "receipt", paymentId, invoiceId, studentId: student.id });
}

export async function sendTestWhatsApp(deps: WhatsAppDeps, current: CurrentUser, phone: string): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  return sendWhatsAppNotification(deps, { schoolId, phone, message: "Pesan uji coba WhatsApp dari ERP Sekolah.", messageType: "reminder", recipientName: current.profile.full_name });
}

export async function sendBulkInvoiceNotifications(deps: WhatsAppDeps, current: CurrentUser, invoiceIds: string[]): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  const settings = await getWhatsAppSettings(deps, schoolId);
  if (!settings?.is_active || !settings.auto_send_invoice) return errResult("Pengiriman tagihan otomatis belum aktif.");
  const { data: invoices } = await deps.supabase
    .from("invoices")
    .select("id, student_id, period_label, due_date, total_amount, students!invoices_student_tenant_fkey(id, nama_lengkap, no_telp_wali, telepon_wali, nama_wali)")
    .in("id", invoiceIds)
    .eq("school_id", schoolId)
    .in("status", ["belum_bayar", "sebagian"]);
  let sent = 0;
  for (const invoice of invoices ?? []) {
    const student = (Array.isArray(invoice.students) ? invoice.students[0] : invoice.students) as (StudentRow & { telepon_wali?: string | null }) | undefined;
    const parentPhone = student?.no_telp_wali || student?.telepon_wali;
    if (!parentPhone) continue;
    const { data: banks } = await deps.supabase.from("bank_accounts").select("bank_name, account_number, account_holder").eq("school_id", schoolId).order("bank_name");
    const rekening = (banks ?? []).map((bank) => `- ${bank.bank_name}: ${bank.account_number} an. ${bank.account_holder}`).join("\n");
    const message = formatTemplate(settings.template_invoice, { nama_siswa: student.nama_lengkap, nama_tagihan: invoice.period_label, nominal: formatRupiah(Number(invoice.total_amount)), jatuh_tempo: new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(invoice.due_date)), rekening_tujuan: rekening });
    const result = await sendWhatsAppNotification(deps, { schoolId, phone: parentPhone, recipientName: student.nama_wali ?? student.nama_lengkap, message, messageType: "invoice", invoiceId: invoice.id, studentId: student.id });
    if (result.ok) sent++;
  }
  return okResult(`${sent} notifikasi tagihan berhasil diproses.`);
}

export const defaultWhatsAppTemplates = { invoice: DEFAULT_INVOICE_TEMPLATE, receipt: DEFAULT_RECEIPT_TEMPLATE };
