import { describe, expect, it } from "vitest";
import { readGenerateInvoicesInput } from "./schema";

describe("readGenerateInvoicesInput", () => {
  it("menerima mode tahun penuh tanpa periode dan tanggal manual", () => {
    const formData = new FormData();
    formData.set("academic_year_id", "123e4567-e89b-42d3-a456-426614174001");
    formData.set("mode", "full_year");
    formData.append("fee_category_ids", "123e4567-e89b-42d3-a456-426614174002");

    const result = readGenerateInvoicesInput(formData);

    expect(result).toEqual({
      ok: true,
      command: {
        academic_year_id: "123e4567-e89b-42d3-a456-426614174001",
        mode: "full_year",
        period_label: "",
        custom_due_date: null,
        only_without_invoice: false,
        fee_category_ids: ["123e4567-e89b-42d3-a456-426614174002"],
      },
    });
  });

  it("menolak mode satu periode tanpa label periode", () => {
    const formData = new FormData();
    formData.set("academic_year_id", "123e4567-e89b-42d3-a456-426614174001");
    formData.set("mode", "single_period");
    formData.append("fee_category_ids", "123e4567-e89b-42d3-a456-426614174002");

    const result = readGenerateInvoicesInput(formData);

    expect(result).toEqual({ ok: false, error: "Periode wajib diisi untuk mode satu periode." });
  });
});
