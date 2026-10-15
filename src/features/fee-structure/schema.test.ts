import { describe, expect, it } from "vitest";
import { saveFeeCategorySchema, saveFeeStructureSchema } from "./schema";

describe("saveFeeCategorySchema", () => {
  it.each(["bulanan", "semester", "tahunan", "sekali"])("accepts %s billing cycle", (billing_cycle) => {
    const result = saveFeeCategorySchema.safeParse({
      id: "",
      name: "SPP",
      billing_cycle,
      description: "",
    });

    expect(result.success).toBe(true);
  });

  it.each(["ganjil", "genap"])("rejects %s billing cycle", (billing_cycle) => {
    const result = saveFeeCategorySchema.safeParse({
      id: "",
      name: "SPP",
      billing_cycle,
      description: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("saveFeeStructureSchema", () => {
  const validInput = {
    academic_year_id: "123e4567-e89b-42d3-a456-426614174001",
    education_level_id: "123e4567-e89b-42d3-a456-426614174002",
    grade_id: "123e4567-e89b-42d3-a456-426614174003",
    fee_category_id: "123e4567-e89b-42d3-a456-426614174004",
    amount: "500000",
  };

  it("accepts a calendar due date", () => {
    const result = saveFeeStructureSchema.safeParse({ ...validInput, due_date: "2026-08-31" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.due_date).toBe("2026-08-31");
  });

  it("rejects an invalid due date format", () => {
    const result = saveFeeStructureSchema.safeParse({ ...validInput, due_date: "31-08-2026" });

    expect(result.success).toBe(false);
  });
});
