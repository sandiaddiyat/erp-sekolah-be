import { describe, expect, it } from "vitest";
import { buildBillingPeriods, calculateDueDate, getAcademicMonths } from "./service";

describe("getAcademicMonths", () => {
  it("menghasilkan 12 bulan untuk tahun ajaran Juli sampai Juni", () => {
    const months = getAcademicMonths("2025-07-01", "2026-06-30");

    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ year: 2025, month: 7, monthLabel: "Juli 2025" });
    expect(months[11]).toMatchObject({ year: 2026, month: 6, monthLabel: "Juni 2026" });
  });
});

describe("calculateDueDate", () => {
  it("menggunakan hari tagih dan menjaga tanggal tetap valid", () => {
    expect(calculateDueDate(2025, 7, 10)).toBe("2025-07-10");
    expect(calculateDueDate(2025, 2, null)).toBe("2025-02-10");
    expect(calculateDueDate(2025, 2, 31)).toBe("2025-02-28");
  });
});

describe("buildBillingPeriods", () => {
  const months = getAcademicMonths("2025-07-01", "2026-06-30");

  it("membuat satu periode per bulan untuk biaya bulanan", () => {
    const periods = buildBillingPeriods("bulanan", "2025/2026", months, 10, null, null);

    expect(periods).toHaveLength(12);
    expect(periods[0]).toMatchObject({ label: "Juli 2025", dueDate: "2025-07-10" });
    expect(periods[11]).toMatchObject({ label: "Juni 2026", dueDate: "2026-06-10" });
  });

  it("membuat periode Ganjil dan Genap sesuai frekuensi", () => {
    expect(buildBillingPeriods("ganjil", "2025/2026", months, null, "2025-08-31", null)).toEqual([
      { label: "Ganjil 2025/2026", dueDate: "2025-08-31" },
    ]);
    expect(buildBillingPeriods("genap", "2025/2026", months, null, "2026-01-31", null)).toEqual([
      { label: "Genap 2025/2026", dueDate: "2026-01-31" },
    ]);
    expect(buildBillingPeriods("semester", "2025/2026", months, null, "2025-08-31", null)).toEqual([
      { label: "Ganjil 2025/2026", dueDate: "2025-08-31" },
    ]);
  });

  it("menggunakan tanggal kustom untuk setiap periode bila diberikan", () => {
    const periods = buildBillingPeriods("bulanan", "2025/2026", months, 10, null, "2025-09-15");

    expect(periods).toHaveLength(12);
    expect(periods[0]).toMatchObject({ label: "Juli 2025", dueDate: "2025-09-15" });
    expect(periods[11]).toMatchObject({ label: "Juni 2026", dueDate: "2025-09-15" });
  });
});
