import type { TelegramLogMessageType, TelegramLogStatus, TelegramSettings } from "@/lib/types";

export type TelegramInlineButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

export type TelegramMessageOptions = {
  parseMode?: "HTML" | "MarkdownV2";
  buttons?: TelegramInlineButton[][];
  signal?: AbortSignal;
};

export type TelegramApiResponse = {
  ok: boolean;
  status: number;
  payload: unknown;
};

export type SendTelegramMessageParams = {
  schoolId: string;
  chatId: string;
  message: string;
  messageType: TelegramLogMessageType;
  recipientName?: string;
  invoiceId?: string;
  paymentId?: string;
  studentId?: string;
  buttons?: TelegramInlineButton[][];
};

export type TelegramDeps = {
  supabase: import("@supabase/supabase-js").SupabaseClient<import("@/lib/database.types").Database>;
};

export type { TelegramLogStatus, TelegramSettings };
