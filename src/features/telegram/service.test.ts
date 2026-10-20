import { afterEach, describe, expect, it, vi } from "vitest";
import { formatTelegramTemplate, generateStudentTelegramLink } from "./service";
import { getTelegramMe, sendTelegramMessage, setTelegramWebhook } from "./telegram-client";

afterEach(() => vi.unstubAllGlobals());

describe("formatTelegramTemplate", () => {
  it("fills placeholders and escapes HTML values", () => {
    expect(formatTelegramTemplate("Hai <b>{{nama_siswa}}</b>: {{nominal}}", { nama_siswa: "A & <B>\"", nominal: 12000 })).toBe("Hai <b>A &amp; &lt;B&gt;&quot;</b>: 12000");
  });

  it("replaces missing values with an empty string", () => {
    expect(formatTelegramTemplate("{{nama_siswa}} {{missing}}", { nama_siswa: "Siswa" })).toBe("Siswa ");
  });
});

describe("generateStudentTelegramLink", () => {
  it("creates a deep link without an at-sign", () => {
    expect(generateStudentTelegramLink("@SekolahKuBot", "student-id")).toBe("https://t.me/SekolahKuBot?start=link_student-id");
  });
});

describe("Telegram Bot API client", () => {
  it("sends an HTML message with inline keyboard", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await sendTelegramMessage("token", "123", "<b>Test</b>", { buttons: [[{ text: "Open", url: "https://example.com" }]] });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("https://api.telegram.org/bottoken/sendMessage", expect.objectContaining({ body: expect.stringContaining('"inline_keyboard"') }));
  });

  it("rejects a Bot API error response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, description: "Unauthorized" }), { status: 401 })));
    const result = await getTelegramMe("bad-token");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("registers Telegram webhook with the secret token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, result: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await setTelegramWebhook("token", "https://school.test/api/webhooks/telegram/inbound", "secret");
    expect(fetchMock).toHaveBeenCalledWith("https://api.telegram.org/bottoken/setWebhook", expect.objectContaining({ body: expect.stringContaining('"secret_token":"secret"') }));
  });
});
