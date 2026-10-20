import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaWhatsAppGateway } from "@/features/whatsapp/gateway-client";
import type { WhatsAppProvider } from "@/lib/types";
import { formatTemplate } from "@/features/whatsapp/service";

export const runtime = "nodejs";

type InboundPayload = { sender_phone?: string; from?: string; message_body?: string; message?: string; text?: string; school_id?: string };

function sameSecret(expected: string | null, received: string | null): boolean {
  return Boolean(expected && received && expected.length === received.length && expected === received);
}

function numberVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return [];
  const international = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  const local = international.startsWith("62") ? `0${international.slice(2)}` : international;
  return [...new Set([digits, international, local])];
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as InboundPayload | null;
  if (!body) return NextResponse.json({ ok: false, error: "Payload tidak valid." }, { status: 400 });
  const sender = body.sender_phone ?? body.from ?? "";
  const command = (body.message_body ?? body.message ?? body.text ?? "").trim().toUpperCase();
  if (!sender || !["#CEKTAGIHAN", "#TAGIHAN"].some((value) => command.includes(value))) return NextResponse.json({ ok: true, ignored: true });
  const url = new URL(request.url);
  const supabase = createAdminClient();
  let settingsQuery = supabase.from("whatsapp_settings").select("*");
  const schoolIdParam = body.school_id ?? url.searchParams.get("school_id");
  if (schoolIdParam) settingsQuery = settingsQuery.eq("school_id", schoolIdParam);
  const { data: settings } = await settingsQuery.limit(20);
  const secret = request.headers.get("x-webhook-secret") ?? request.headers.get("x-webhook-token") ?? url.searchParams.get("secret");
  const setting = (settings ?? []).find((item) => sameSecret(item.webhook_secret, secret) && item.is_active);
  if (!setting) return NextResponse.json({ ok: false, error: "Webhook tidak terautentikasi." }, { status: 401 });
  const variants = numberVariants(sender);
  const [studentsByNoTelp, studentsByTelepon] = await Promise.all([
    supabase.from("students").select("id, nama_lengkap, no_telp_wali, telepon_wali").eq("school_id", setting.school_id).in("no_telp_wali", variants),
    supabase.from("students").select("id, nama_lengkap, no_telp_wali, telepon_wali").eq("school_id", setting.school_id).in("telepon_wali", variants),
  ]);
  const students = [...(studentsByNoTelp.data ?? []), ...(studentsByTelepon.data ?? [])];
  const student = students[0];
  let reply = "Nomor WhatsApp Anda belum terdaftar di sistem sekolah kami. Silakan hubungi tata usaha untuk pembaruan nomor wali.";
  if (student) {
    const { data: invoices } = await supabase.from("invoices").select("id, period_label, total_amount, status, due_date").eq("school_id", setting.school_id).eq("student_id", student.id).in("status", ["belum_bayar", "sebagian"]).order("due_date");
    const ids = (invoices ?? []).map((invoice) => invoice.id);
    const { data: payments } = ids.length ? await supabase.from("payment_invoices").select("invoice_id, amount, payments!payment_invoices_payment_tenant_fkey(status)").eq("school_id", setting.school_id).in("invoice_id", ids) : { data: [] };
    const paid = new Map<string, number>();
    for (const item of payments ?? []) { const payment = Array.isArray(item.payments) ? item.payments[0] : item.payments; if (payment?.status === "terverifikasi") paid.set(item.invoice_id, (paid.get(item.invoice_id) ?? 0) + Number(item.amount)); }
    const lines = (invoices ?? []).map((invoice, index) => `${index + 1}. ${invoice.period_label}: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Math.max(0, Number(invoice.total_amount) - (paid.get(invoice.id) ?? 0)))}`).join("\n");
    const total = (invoices ?? []).reduce((sum, invoice) => sum + Math.max(0, Number(invoice.total_amount) - (paid.get(invoice.id) ?? 0)), 0);
    const { data: banks } = await supabase.from("bank_accounts").select("bank_name, account_number, account_holder").eq("school_id", setting.school_id).order("bank_name");
    const rekening = (banks ?? []).map((bank) => `- ${bank.bank_name}: ${bank.account_number} an. ${bank.account_holder}`).join("\n");
    reply = `Rincian Tagihan an. ${student.nama_lengkap}:\n${lines || "Tidak ada tunggakan."}\n\nTotal Belum Dibayar: ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(total)}\n\nPembayaran dapat ditransfer ke:\n${rekening || "Silakan hubungi sekolah untuk rekening pembayaran."}`;
  }
  const response = await sendViaWhatsAppGateway(setting.provider as WhatsAppProvider, setting.api_token, sender, reply);
  await supabase.from("whatsapp_logs").insert({ school_id: setting.school_id, recipient_phone: sender, message_type: "bot_inbound", content: reply, status: response.ok ? "sent" : "failed", response_payload: response.payload as never, error_message: response.ok ? null : `Provider HTTP ${response.status}`, student_id: student?.id ?? null });
  return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : 502 });
}
