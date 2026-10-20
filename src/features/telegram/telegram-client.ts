import type { TelegramApiResponse, TelegramInlineButton, TelegramMessageOptions } from "./types";

const API_BASE = "https://api.telegram.org/bot";

async function callTelegramApi(botToken: string, method: string, body: unknown, signal?: AbortSignal): Promise<TelegramApiResponse> {
  const response = await fetch(`${API_BASE}${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { ok: response.ok && Boolean((payload as { ok?: boolean } | null)?.ok ?? true), status: response.status, payload };
}

export function sendTelegramMessage(botToken: string, chatId: string, text: string, options?: TelegramMessageOptions): Promise<TelegramApiResponse> {
  const reply_markup = options?.buttons?.length ? { inline_keyboard: options.buttons } : undefined;
  return callTelegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options?.parseMode ?? "HTML",
    ...(reply_markup ? { reply_markup } : {}),
  }, options?.signal);
}

export function sendTelegramDocument(botToken: string, chatId: string, document: string, caption?: string, signal?: AbortSignal): Promise<TelegramApiResponse> {
  return callTelegramApi(botToken, "sendDocument", { chat_id: chatId, document, ...(caption ? { caption, parse_mode: "HTML" } : {}) }, signal);
}

export function getTelegramMe(botToken: string, signal?: AbortSignal): Promise<TelegramApiResponse> {
  return callTelegramApi(botToken, "getMe", {}, signal);
}

export function setTelegramWebhook(botToken: string, url: string, secretToken: string, signal?: AbortSignal): Promise<TelegramApiResponse> {
  return callTelegramApi(botToken, "setWebhook", { url, secret_token: secretToken, allowed_updates: ["message", "callback_query"] }, signal);
}

export type { TelegramInlineButton };
