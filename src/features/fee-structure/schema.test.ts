import { describe, expect, it } from "vitest";
import { saveFeeCategorySchema } from "./schema";

describe("saveFeeCategorySchema", () => {
  it.each(["ganjil", "genap"])("accepts %s billing cycle", (billing_cycle) => {
    const result = saveFeeCategorySchema.safeParse({
      id: "",
      name: "SPP",
      billing_cycle,
      description: "",
    });

    expect(result.success).toBe(true);
  });
});
