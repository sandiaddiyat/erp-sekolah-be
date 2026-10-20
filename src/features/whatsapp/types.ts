import type { WhatsAppProvider } from "@/lib/types";

export type { WhatsAppProvider };

export type SendWhatsAppMessageParams = {
  schoolId: string;
  phone: string;
  message: string;
  messageType: "invoice" | "receipt" | "reminder" | "bot_inbound";
  recipientName?: string;
  invoiceId?: string;
  paymentId?: string;
  studentId?: string;
};

export type WhatsAppGatewayResponse = {
  ok: boolean;
  status: number;
  payload: unknown;
};
