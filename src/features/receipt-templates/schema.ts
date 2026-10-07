import { z } from "zod";

export const saveReceiptTemplateSchema = z.object({
  id: z.string().trim().optional().transform((value) => value || undefined),
  name: z.string().trim().min(3, "Nama template minimal 3 karakter").max(120, "Nama template maksimal 120 karakter"),
  content_html: z.string().trim().min(1, "HTML template wajib diisi").max(100_000, "HTML template terlalu besar"),
  content_css: z.string().trim().max(100_000, "CSS template terlalu besar").optional().default(""),
  is_default: z.boolean().default(false),
});

export type SaveReceiptTemplateInput = z.infer<typeof saveReceiptTemplateSchema>;

export type SaveReceiptTemplateParseResult =
  | { ok: true; command: SaveReceiptTemplateInput }
  | { ok: false; error: string };

export function readSaveReceiptTemplateInput(formData: FormData): SaveReceiptTemplateParseResult {
  const parsed = saveReceiptTemplateSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    content_html: formData.get("content_html") ?? "",
    content_css: formData.get("content_css") ?? "",
    is_default: formData.get("is_default") === "on",
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data template tidak valid." };
  }

  return { ok: true, command: parsed.data };
}

export function readReceiptTemplateId(formData: FormData): { ok: true; id: string } | { ok: false; error: string } {
  const parsed = z.uuid().safeParse(String(formData.get("id") ?? "").trim());
  return parsed.success ? { ok: true, id: parsed.data } : { ok: false, error: "ID template tidak valid." };
}
