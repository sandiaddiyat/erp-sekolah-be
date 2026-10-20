import { describe, expect, it } from "vitest";
import { normalizeWhatsAppPhone } from "./gateway-client";
import { formatTemplate, getAppBaseUrl } from "./service";
import { readSaveWhatsAppSettingsInput, readSendBulkInvoiceWAInput, readSendTestWhatsAppInput } from "./schema";

describe("whatsapp utilities", () => {
  it.each([
    ["0812 3456-7890", "6281234567890"],
    ["+62 812-3456-7890", "6281234567890"],
    ["6281234567890", "6281234567890"],
    ["", ""],
  ])("menormalisasi nomor %s", (input, expected) => {
    expect(normalizeWhatsAppPhone(input)).toBe(expected);
  });

  it("mengganti placeholder template dan mengosongkan variabel yang tidak tersedia", () => {
    expect(
      formatTemplate("Halo {{nama_siswa}}, total {{nominal}}. {{kosong}}", {
        nama_siswa: "Budi",
        nominal: "Rp10.000",
      })
    ).toBe("Halo Budi, total Rp10.000. ");
  });

  it("mengembalikan base URL yang valid saat variabel env tidak disetel", () => {
    const url = getAppBaseUrl();
    expect(url).toMatch(/^https?:\/\//);
  });
});

describe("whatsapp schema parsers", () => {
  it("memvalidasi data konfigurasi WhatsApp yang valid", () => {
    const formData = new FormData();
    formData.append("provider", "fonnte");
    formData.append("api_token", "sample-secret-token");
    formData.append("sender_number", "628123456789");
    formData.append("is_active", "on");
    formData.append("auto_send_receipt", "on");
    formData.append("auto_send_invoice", "on");
    formData.append("template_invoice", "Tagihan {{nominal}}");
    formData.append("template_receipt", "Kuitansi {{nominal}}");

    const parsed = readSaveWhatsAppSettingsInput(formData);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.command.provider).toBe("fonnte");
      expect(parsed.command.api_token).toBe("sample-secret-token");
      expect(parsed.command.is_active).toBe(true);
      expect(parsed.command.auto_send_receipt).toBe(true);
      expect(parsed.command.auto_send_invoice).toBe(true);
    }
  });

  it("menolak konfigurasi dengan token kosong", () => {
    const formData = new FormData();
    formData.append("provider", "fonnte");
    formData.append("api_token", "");
    formData.append("template_invoice", "Invoice");
    formData.append("template_receipt", "Receipt");

    const parsed = readSaveWhatsAppSettingsInput(formData);
    expect(parsed.ok).toBe(false);
  });

  it("memvalidasi pengiriman pesan uji coba", () => {
    const formData = new FormData();
    formData.append("phone", "081234567890");
    const parsed = readSendTestWhatsAppInput(formData);
    expect(parsed.ok).toBe(true);
  });

  it("memvalidasi bulk invoice ID yang valid", () => {
    const formData = new FormData();
    formData.append("invoice_ids", "11111111-1111-4111-8111-111111111111");
    formData.append("invoice_ids", "22222222-2222-4222-8222-222222222222");
    const parsed = readSendBulkInvoiceWAInput(formData);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.command.invoice_ids).toHaveLength(2);
    }
  });
});
