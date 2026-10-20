import type { CurrentUser, TelegramSettings } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import { createReceiptAccessToken, getAppBaseUrl } from "@/features/whatsapp/service";
import { getTelegramMe, sendTelegramMessage, setTelegramWebhook } from "./telegram-client";
import type { SaveTelegramSettingsInput } from "./schema";
import type { SendTelegramMessageParams, TelegramDeps } from "./types";

const DEFAULT_INVOICE_TEMPLATE = "Yth. Orang tua dari <b>{{nama_siswa}}</b>, tagihan <b>{{nama_tagihan}}</b> sebesar <b>{{nominal}}</b> telah terbit dengan jatuh tempo <b>{{jatuh_tempo}}</b>. Pembayaran dapat ditransfer ke:<br>{{rekening_tujuan}}<br><br>Terima kasih.";
const DEFAULT_RECEIPT_TEMPLATE = "Alhamdulillah, pembayaran <b>{{nama_tagihan}}</b> an. <b>{{nama_siswa}}</b> sebesar <b>{{nominal}}</b> telah kami terima pada <b>{{tanggal_bayar}}</b>.<br><br>Terima kasih atas kepercayaannya.";

type TemplateVariables = Record<string, string | number | null | undefined>;
type PaymentItem = { invoice_id: string; amount: number; invoices: { student_id: string; period_label: string } | { student_id: string; period_label: string }[] | null };
type StudentRow = { id: string; nama_lengkap: string; nama_wali: string | null; telegram_chat_id: string | null; telegram_username: string | null };

function schoolIdOf(current: CurrentUser): string | null {
  return current.profile.school_id ?? null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

export function formatTelegramTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (_placeholder, key: string) => {
    const value = variables[key];
    return value === null || value === undefined ? "" : escapeHtml(String(value));
  });
}

export function generateStudentTelegramLink(botUsername: string, studentId: string): string {
  return `https://t.me/${botUsername.replace(/^@/, "")}?start=link_${encodeURIComponent(studentId)}`;
}

export async function getTelegramSettings(deps: TelegramDeps, schoolId: string): Promise<TelegramSettings | null> {
  if (!schoolId) return null;
  const { data, error } = await deps.supabase.from("telegram_settings").select("*").eq("school_id", schoolId).maybeSingle();
  if (error) {
    console.error("[telegram/service] getTelegramSettings error:", error);
    return null;
  }
  return data as TelegramSettings | null;
}

export async function saveTelegramSettingsRecord(deps: TelegramDeps, current: CurrentUser, input: SaveTelegramSettingsInput): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");

  const existing = await deps.supabase.from("telegram_settings").select("bot_token, webhook_secret, bot_username").eq("school_id", schoolId).maybeSingle();
  const botToken = input.bot_token || existing.data?.bot_token || "";
  if (botToken.length < 10) return errResult("Bot token wajib diisi.");
  const botResult = await getTelegramMe(botToken);
  const botPayload = botResult.payload as { result?: { username?: string } } | null;
  if (!botResult.ok || !botPayload?.result) return errResult("Bot token Telegram tidak valid atau tidak dapat diverifikasi.");

  const webhookSecret = existing.data?.webhook_secret ?? crypto.randomUUID().replace(/-/g, "");
  const botUsername = botPayload.result.username ?? input.bot_username?.replace(/^@/, "") ?? existing.data?.bot_username ?? null;
  const { data: saved, error } = await deps.supabase.from("telegram_settings").upsert({
    school_id: schoolId,
    bot_token: botToken,
    bot_username: botUsername,
    is_active: input.is_active,
    auto_send_invoice: input.auto_send_invoice,
    auto_send_receipt: input.auto_send_receipt,
    template_invoice: input.template_invoice || DEFAULT_INVOICE_TEMPLATE,
    template_receipt: input.template_receipt || DEFAULT_RECEIPT_TEMPLATE,
    webhook_secret: webhookSecret,
  }, { onConflict: "school_id" }).select("*").single();
  if (error || !saved) return errResult("Gagal menyimpan pengaturan Telegram.");

  if (input.is_active) {
    const webhook = await setTelegramWebhook(input.bot_token, `${getAppBaseUrl()}/api/webhooks/telegram/inbound`, webhookSecret);
    if (!webhook.ok) return errResult("Pengaturan tersimpan, tetapi webhook Telegram gagal didaftarkan.");
  }

  return okResult("Pengaturan Telegram berhasil disimpan.");
}

export async function sendTelegramNotification(deps: TelegramDeps, params: SendTelegramMessageParams): Promise<MutationResult> {
  const settings = await getTelegramSettings(deps, params.schoolId);
  if (!settings?.is_active || !settings.bot_token) return errResult("Bot Telegram belum aktif atau token belum diatur.");

  const { data: log, error: logError } = await deps.supabase.from("telegram_logs").insert({
    school_id: params.schoolId,
    chat_id: params.chatId,
    recipient_name: params.recipientName ?? null,
    message_type: params.messageType,
    content: params.message,
    status: "pending",
    invoice_id: params.invoiceId ?? null,
    payment_id: params.paymentId ?? null,
    student_id: params.studentId ?? null,
  }).select("id").single();
  if (logError || !log) return errResult("Gagal mencatat antrean notifikasi Telegram.");

  try {
    const response = await sendTelegramMessage(settings.bot_token, params.chatId, params.message, { parseMode: "HTML", buttons: params.buttons });
    const sent = response.ok && response.status >= 200 && response.status < 300;
    await deps.supabase.from("telegram_logs").update({ status: sent ? "sent" : "failed", response_payload: response.payload as never, error_message: sent ? null : `Telegram mengembalikan HTTP ${response.status}` }).eq("id", log.id).eq("school_id", params.schoolId);
    return sent ? okResult("Pesan Telegram berhasil dikirim.") : errResult(`Pesan Telegram gagal dikirim (HTTP ${response.status}).`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kesalahan jaringan.";
    await deps.supabase.from("telegram_logs").update({ status: "failed", error_message: message }).eq("id", log.id).eq("school_id", params.schoolId);
    return errResult("Pesan Telegram gagal dikirim.");
  }
}

export async function sendTestTelegram(deps: TelegramDeps, current: CurrentUser, chatId: string): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  return sendTelegramNotification(deps, { schoolId, chatId, message: "Pesan uji coba Telegram dari ERP Sekolah.", messageType: "reminder", recipientName: current.profile.full_name });
}

async function paymentMessageData(deps: TelegramDeps, paymentId: string, schoolId: string) {
  const { data: payment } = await deps.supabase.from("payments").select("id, nominal, diverifikasi_pada, created_at, payment_method_id").eq("id", paymentId).eq("school_id", schoolId).eq("status", "terverifikasi").maybeSingle();
  if (!payment) return null;
  const { data: items } = await deps.supabase.from("payment_invoices").select("invoice_id, amount, invoices!payment_invoices_invoice_tenant_fkey(student_id, period_label)").eq("payment_id", paymentId).eq("school_id", schoolId);
  const paymentItems = (items ?? []) as unknown as PaymentItem[];
  const first = paymentItems[0];
  const invoice = Array.isArray(first?.invoices) ? first.invoices[0] : first?.invoices;
  if (!invoice?.student_id) return null;
  const studentResult = await deps.supabase.from("students").select("id, nama_lengkap, nama_wali, telegram_chat_id, telegram_username").eq("id", invoice.student_id).eq("school_id", schoolId).maybeSingle();
  const student = studentResult.data as StudentRow | null;
  if (!student) return null;
  const { data: method } = await deps.supabase.from("payment_methods").select("name").eq("id", payment.payment_method_id ?? "").eq("school_id", schoolId).maybeSingle();
  return { payment, paymentItems, student, method, invoiceId: first.invoice_id, name: paymentItems.map((item) => { const value = Array.isArray(item.invoices) ? item.invoices[0] : item.invoices; return value?.period_label; }).filter(Boolean).join(", ") || "Pembayaran" };
}

export async function triggerTelegramReceiptNotification(deps: TelegramDeps, paymentId: string, schoolId: string): Promise<MutationResult> {
  const settings = await getTelegramSettings(deps, schoolId);
  if (!settings?.is_active || !settings.auto_send_receipt) return okResult("Notifikasi kuitansi Telegram tidak aktif.");
  const data = await paymentMessageData(deps, paymentId, schoolId);
  if (!data) return errResult("Pembayaran atau relasi tagihan tidak ditemukan.");
  if (!data.student.telegram_chat_id) return okResult("Chat Telegram wali belum terhubung.");
  const receiptUrl = await createReceiptAccessToken(deps, paymentId, schoolId);
  if (!receiptUrl) return errResult("Gagal membuat tautan kuitansi.");
  const paidAt = data.payment.diverifikasi_pada ?? data.payment.created_at;
  const message = formatTelegramTemplate(settings.template_receipt, {
    nama_siswa: data.student.nama_lengkap,
    nama_tagihan: data.name,
    nominal: formatRupiah(Number(data.payment.nominal)),
    tanggal_bayar: new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(paidAt)),
    metode_pembayaran: data.method?.name ?? "Kas / Bank",
    link_kuitansi: receiptUrl,
  });
  return sendTelegramNotification(deps, {
    schoolId,
    chatId: data.student.telegram_chat_id,
    recipientName: data.student.nama_wali ?? data.student.nama_lengkap,
    message,
    messageType: "receipt",
    paymentId,
    invoiceId: data.invoiceId,
    studentId: data.student.id,
    buttons: [[{ text: "Unduh kuitansi digital", url: receiptUrl }]],
  });
}

export async function sendBulkInvoiceTelegramNotifications(deps: TelegramDeps, current: CurrentUser, invoiceIds: string[]): Promise<MutationResult> {
  const schoolId = schoolIdOf(current);
  if (!schoolId) return errResult("Sekolah aktif tidak ditemukan.");
  const settings = await getTelegramSettings(deps, schoolId);
  if (!settings?.is_active || !settings.auto_send_invoice) return errResult("Pengiriman tagihan Telegram belum aktif.");
  const { data: invoices } = await deps.supabase.from("invoices").select("id, student_id, period_label, due_date, total_amount, students!invoices_student_tenant_fkey(id, nama_lengkap, nama_wali, telegram_chat_id)").in("id", invoiceIds).eq("school_id", schoolId).in("status", ["belum_bayar", "sebagian"]);
  const { data: banks } = await deps.supabase.from("bank_accounts").select("bank_name, account_number, account_holder").eq("school_id", schoolId).order("bank_name");
  const rekening = (banks ?? []).map((bank) => `- ${bank.bank_name}: ${bank.account_number} an. ${bank.account_holder}`).join("<br>");
  let sent = 0;
  for (const invoice of invoices ?? []) {
    const student = (Array.isArray(invoice.students) ? invoice.students[0] : invoice.students) as (StudentRow | undefined);
    if (!student?.telegram_chat_id) continue;
    const message = formatTelegramTemplate(settings.template_invoice, {
      nama_siswa: student.nama_lengkap,
      nama_tagihan: invoice.period_label,
      nominal: formatRupiah(Number(invoice.total_amount)),
      jatuh_tempo: new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(invoice.due_date)),
      rekening_tujuan: rekening,
    });
    const result = await sendTelegramNotification(deps, { schoolId, chatId: student.telegram_chat_id, recipientName: student.nama_wali ?? student.nama_lengkap, message, messageType: "invoice", invoiceId: invoice.id, studentId: student.id });
    if (result.ok) sent++;
  }
  return okResult(`${sent} notifikasi tagihan Telegram berhasil diproses.`);
}

export async function getStudentTelegramLink(deps: TelegramDeps, studentId: string, schoolId: string): Promise<string | null> {
  const settings = await getTelegramSettings(deps, schoolId);
  if (!settings?.is_active || !settings.bot_username) return null;
  const { data: student } = await deps.supabase.from("students").select("id").eq("id", studentId).eq("school_id", schoolId).maybeSingle();
  return student ? generateStudentTelegramLink(settings.bot_username, studentId) : null;
}

export const defaultTelegramTemplates = { invoice: DEFAULT_INVOICE_TEMPLATE, receipt: DEFAULT_RECEIPT_TEMPLATE };
