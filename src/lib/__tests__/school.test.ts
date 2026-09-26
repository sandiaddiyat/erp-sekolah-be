import { describe, it, expect, vi, afterEach } from "vitest";
import { subscriptionProblem, formatActiveUntil } from "@/lib/school";
import type { School } from "@/lib/types";

function makeSchool(overrides: Partial<School> = {}): School {
  return {
    id: "test-id",
    name: "Sekolah Test",
    slug: "sekolah-test",
    npsn: null,
    nis_nss_nds: null,
    kode_pos: null,
    level: null,
    address: null,
    phone: null,
    email: null,
    logo_url: null,
    status: "active",
    active_until: null,
    notes: null,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    kelurahan: null,
    kecamatan: null,
    kota: null,
    provinsi: null,
    website: null,
    dinas: null,
    ...overrides,
  };
}

describe("subscriptionProblem", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mengembalikan null jika school null", () => {
    expect(subscriptionProblem(null)).toBeNull();
  });

  it("mengembalikan 'suspended' jika status suspended", () => {
    expect(subscriptionProblem(makeSchool({ status: "suspended" }))).toBe("suspended");
  });

  it("mengembalikan 'expired' jika active_until sudah lewat", () => {
    expect(subscriptionProblem(makeSchool({ active_until: "2020-01-01" }))).toBe("expired");
  });

  it("mengembalikan null jika active_until belum lewat", () => {
    expect(subscriptionProblem(makeSchool({ active_until: "2099-12-31" }))).toBeNull();
  });

  it("mengembalikan null jika active_until kosong (tanpa batas)", () => {
    expect(subscriptionProblem(makeSchool({ active_until: null }))).toBeNull();
  });
});

describe("formatActiveUntil", () => {
  it("mengembalikan 'Tanpa batas' jika null", () => {
    expect(formatActiveUntil(null)).toBe("Tanpa batas");
  });

  it("mengembalikan '-' jika format tidak valid", () => {
    expect(formatActiveUntil("bukan-tanggal")).toBe("-");
  });

  it("memformat tanggal dalam bahasa Indonesia", () => {
    const result = formatActiveUntil("2024-06-15");
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
    expect(result).not.toBe("Tanpa batas");
  });
});
