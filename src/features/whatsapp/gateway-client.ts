import type { WhatsAppProvider } from "./types";

const FONNTE_URL = "https://api.fonnte.com/send";
const WABLAS_URL = "https://api.wablas.com/api/send-message";

export function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export async function sendViaWhatsAppGateway(
  provider: WhatsAppProvider,
  apiToken: string,
  phone: string,
  message: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  const target = normalizeWhatsAppPhone(phone);
  if (!target) throw new Error("Nomor WhatsApp penerima tidak valid.");
  const response = await fetch(provider === "fonnte" ? FONNTE_URL : WABLAS_URL, {
    method: "POST",
    headers: {
      Authorization: apiToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(provider === "fonnte" ? { target, message } : { phone: target, message }),
    signal: signal ?? AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok, status: response.status, payload };
}
