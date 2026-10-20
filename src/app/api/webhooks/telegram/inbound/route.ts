import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/features/telegram/telegram-client";

export const runtime = "nodejs";

type TelegramUser = { id: number; username?: string; first_name?: string; last_name?: string };
type TelegramChat = { id: number };
type TelegramMessage = { message_id: number; text?: string; chat: TelegramChat; from?: TelegramUser };
type TelegramUpdate = { update_id?: number; message?: TelegramMessage; callback_query?: { id: string; data?: string; message?: TelegramMessage; from?: TelegramUser } };
type TelegramSetting = { school_id: string; bot_token: string; webhook_secret: string; is_active: boolean };

type Invoice = { id: string; period_label: string; total_amount: number; due_date: string };

function sameSecret(expected: string | null | undefined, received: string | null): boolean {
  return Boolean(expected && received && expected.length === received.length && expected === received);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function formatIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function parseCommand(text: string): { command: string; argument: string } {
  const [rawCommand, ...args] = text.trim().split(/\s+/);
  return { command: (rawCommand ?? "").split("@")[0].toLowerCase(), argument: args.join(" ") };
}

async function loadOutstanding(supabase: ReturnType<typeof createAdminClient>, schoolId: string, studentId: string) {
  const { data: invoices } = await supabase.from("invoices").select("id, period_label, total_amount, due_date").eq("school_id", schoolId).eq("student_id", studentId).in("status", ["belum_bayar", "sebagian"]).order("due_date");
  const rows = (invoices ?? []) as Invoice[];
  const ids = rows.map((invoice) => invoice.id);
  const { data: payments } = ids.length
    ? await supabase.from("payment_invoices").select("invoice_id, amount, payments!payment_invoices_payment_tenant_fkey(status)").eq("school_id", schoolId).in("invoice_id", ids)
    : { data: [] };
  const paid = new Map<string, number>();
  for (const item of payments ?? []) {
    const payment = Array.isArray(item.payments) ? item.payments[0] : item.payments;
    if (payment?.status === "terverifikasi") paid.set(item.invoice_id, (paid.get(item.invoice_id) ?? 0) + Number(item.amount));
  }
  return rows.map((invoice) => ({ ...invoice, remaining: Math.max(0, Number(invoice.total_amount) - (paid.get(invoice.id) ?? 0)) }));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as TelegramUpdate | null;
  if (!body) return NextResponse.json({ ok: false, error: "Payload Telegram tidak valid." }, { status: 400 });
  const message = body.message ?? body.callback_query?.message;
  const chatId = message?.chat.id;
  if (chatId === undefined) return NextResponse.json({ ok: true, ignored: true });

  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("telegram_settings").select("school_id, bot_token, webhook_secret, is_active").eq("is_active", true).limit(50);
  const setting = (settings ?? []).find((item) => sameSecret((item as TelegramSetting).webhook_secret, secret)) as TelegramSetting | undefined;
  if (!setting) return NextResponse.json({ ok: false, error: "Webhook tidak terautentikasi." }, { status: 401 });

  const text = message?.text ?? body.callback_query?.data ?? "";
  const { command, argument } = parseCommand(text);
  let reply = "Gunakan /tagihan untuk melihat tunggakan atau /bantuan untuk daftar perintah.";
  let studentId: string | null = null;
  const recipientName = message?.from ? [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || message.from.username || null : null;

  if (command === "/start" && argument.startsWith("link_")) {
    const candidateId = argument.slice("link_".length);
    const { data: student } = await supabase.from("students").select("id, nama_lengkap").eq("id", candidateId).eq("school_id", setting.school_id).maybeSingle();
    if (student) {
      studentId = student.id;
      await supabase.from("students").update({ telegram_chat_id: String(chatId), telegram_username: message?.from?.username ?? null }).eq("id", student.id).eq("school_id", setting.school_id);
      reply = `Selamat, akun Telegram berhasil terhubung dengan data siswa <b>${escapeHtml(student.nama_lengkap)}</b>. Anda akan menerima pemberitahuan tagihan dan kuitansi pembayaran melalui chat ini.`;
    } else {
      reply = "Tautan penghubung siswa tidak valid atau siswa tidak ditemukan.";
    }
  } else if (["/tagihan", "/cektagihan"].includes(command)) {
    const { data: student } = await supabase.from("students").select("id, nama_lengkap, telegram_chat_id").eq("school_id", setting.school_id).eq("telegram_chat_id", String(chatId)).maybeSingle();
    if (student) {
      studentId = student.id;
      const invoices = await loadOutstanding(supabase, setting.school_id, student.id);
      const total = invoices.reduce((sum, invoice) => sum + invoice.remaining, 0);
      const lines = invoices.map((invoice, index) => `${index + 1}. <b>${escapeHtml(invoice.period_label)}</b>: ${formatIdr(invoice.remaining)} (jatuh tempo ${escapeHtml(invoice.due_date.slice(0, 10))})`).join("\n");
      const { data: banks } = await supabase.from("bank_accounts").select("bank_name, account_number, account_holder").eq("school_id", setting.school_id).order("bank_name");
      const rekening = (banks ?? []).map((bank) => `- ${escapeHtml(bank.bank_name)}: ${escapeHtml(bank.account_number)} an. ${escapeHtml(bank.account_holder)}`).join("\n");
      reply = `<b>Rincian tagihan ${escapeHtml(student.nama_lengkap)}</b>\n\n${lines || "Tidak ada tunggakan."}\n\n<b>Total belum dibayar: ${formatIdr(total)}</b>\n\nPembayaran dapat ditransfer ke:\n${rekening || "Silakan hubungi sekolah untuk rekening pembayaran."}`;
    } else {
      reply = "Akun Telegram ini belum terhubung ke data siswa. Minta admin sekolah mengirimkan tautan penghubung Telegram.";
    }
  } else if (command === "/bantuan" || command === "/help") {
    reply = "<b>Perintah bot sekolah</b>\n\n/tagihan atau /cektagihan - melihat tunggakan\n/bantuan - melihat bantuan";
  }

  const response = await sendTelegramMessage(setting.bot_token, String(chatId), reply, { parseMode: "HTML" });
  await supabase.from("telegram_logs").insert({ school_id: setting.school_id, chat_id: String(chatId), recipient_name: recipientName, message_type: "bot_inbound", content: reply, status: response.ok ? "sent" : "failed", response_payload: response.payload as never, error_message: response.ok ? null : `Telegram HTTP ${response.status}`, student_id: studentId });
  return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : 502 });
}
