import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  createBillRecord,
  recordPaymentRecord,
  verifyPaymentRecord,
  deleteBillRecord,
} from "@/features/keuangan/service";
import {
  readSaveBillInput,
  readSavePaymentInput,
} from "@/features/keuangan/schema";
import type { CurrentUser } from "@/lib/types";

vi.mock("@/lib/errors", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/errors")>();
  return {
    ...original,
    serverError: (error: unknown, fallback: string) => fallback,
  };
});

type Row = { data?: unknown; error?: unknown; count?: number };

/**
 * Mock query Supabase yang meniru chaining: eq, single, limit, select.
 * `resolve` dipanggil saat promise diselesaikan agar data bisa dinamis
 * (misalnya membaca filter eq yang terakhir dipanggil).
 */
class QueryMock implements PromiseLike<Row> {
  data: unknown;
  error: unknown;
  calls: string[] = [];
  isSingle = false;
  resolveFn: ((q: QueryMock) => { data: unknown; error: unknown }) | null = null;

  constructor(
    data: unknown = null,
    error: unknown = null,
    resolveFn?: (q: QueryMock) => { data: unknown; error: unknown }
  ) {
    this.data = data;
    this.error = error;
    this.resolveFn = resolveFn ?? null;
  }
  select(columns?: string) {
    this.calls.push(`select:${columns ?? ""}`);
    return this;
  }
  eq(column: string, value: unknown) {
    this.calls.push(`eq:${column}=${String(value)}`);
    return this;
  }
  single() {
    this.isSingle = true;
    this.calls.push("single");
    return this;
  }
  limit(n: number) {
    this.calls.push(`limit:${n}`);
    return this;
  }
  insert(payload: unknown) {
    this.calls.push(`insert:${JSON.stringify(payload)}`);
    return this;
  }
  update(payload: unknown) {
    this.calls.push(`update:${JSON.stringify(payload)}`);
    return this;
  }
  delete() {
    this.calls.push("delete");
    return this;
  }
  then<TResult1 = Row, TResult2 = never>(
    onfulfilled?: ((value: Row) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const resolved =
      this.resolveFn?.({ ...this, then: undefined }) ?? {
        data: this.data,
        error: this.error,
      };
    return Promise.resolve<Row>(resolved).then(onfulfilled, onrejected);
  }
}

function makeUser(): CurrentUser {
  return {
    id: "user-1",
    email: "admin@test.com",
    profile: {
      id: "user-1",
      school_id: "school-1",
      full_name: "Test Admin",
      email: "admin@test.com",
      phone: null,
      avatar_url: null,
      jabatan: "Admin",
      is_active: true,
      is_super_admin: false,
      last_login_at: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    school: null,
    roles: [],
    permissions: [],
    isSuperAdmin: false,
  };
}

function makeSupabase(
  config: Record<string, () => QueryMock>
): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      const factory = config[table];
      if (!factory) throw new Error(`Tabel tak terduga: ${table}`);
      return factory();
    },
  } as unknown as SupabaseClient<Database>;
}

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

const VALID_BILL = {
  student_id: "22222222-2222-4222-8222-222222222222",
  deskripsi: "SPP Juli 2026",
  nominal: "150000",
};

const VALID_PAYMENT = {
  bill_id: "33333333-3333-4333-8333-333333333333",
  nominal: "150000",
  metode: "transfer",
};

describe("readSaveBillInput (schema)", () => {
  it("menerima tagihan lengkap", () => {
    const result = readSaveBillInput(formData(VALID_BILL));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.nominal).toBe(150000);
      expect(result.command.deskripsi).toBe("SPP Juli 2026");
    }
  });

  it("menolak nominal 0 atau bukan angka", () => {
    const result = readSaveBillInput(
      formData({ ...VALID_BILL, nominal: "abc" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak tanpa siswa", () => {
    const result = readSaveBillInput(
      formData({ ...VALID_BILL, student_id: "" })
    );
    expect(result.ok).toBe(false);
  });
});

describe("readSavePaymentInput (schema)", () => {
  it("menerima pembayaran lengkap", () => {
    const result = readSavePaymentInput(formData(VALID_PAYMENT));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.metode).toBe("transfer");
      expect(result.command.nominal).toBe(150000);
    }
  });

  it("menolak metode tidak valid", () => {
    const result = readSavePaymentInput(
      formData({ ...VALID_PAYMENT, metode: "barter" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak bukti_url bukan http(s)", () => {
    const result = readSavePaymentInput(
      formData({ ...VALID_PAYMENT, bukti_url: "ftp://file" })
    );
    expect(result.ok).toBe(false);
  });
});

describe("createBillRecord (service)", () => {
  it("membuat tagihan dengan school_id dari user login", async () => {
    const bills = new QueryMock();
    const supabase = makeSupabase({ bills: () => bills });

    const parsed = readSaveBillInput(formData(VALID_BILL));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await createBillRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    const insertCall = bills.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.student_id).toBe(VALID_BILL.student_id);
    expect(payload.nominal).toBe(150000);
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeSupabase({});
    const user = makeUser();
    user.profile.school_id = null;

    const parsed = readSaveBillInput(formData(VALID_BILL));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await createBillRecord({ supabase }, user, parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });

  it("memberi pesan ramah saat tagihan duplikat", async () => {
    const bills = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "bills_deskripsi_key"',
    });
    const supabase = makeSupabase({ bills: () => bills });

    const parsed = readSaveBillInput(formData(VALID_BILL));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await createBillRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah ada");
    }
  });
});

describe("recordPaymentRecord (service)", () => {
  it("mencatat pembayaran dan mengubah bill menjadi menunggu_verifikasi", async () => {
    const payments = new QueryMock();
    const bills = new QueryMock();
    let callCount = 0;
    const supabase = makeSupabase({
      bills: () => {
        callCount += 1;
        // Panggilan pertama: select single status bill; kedua: update status.
        return callCount === 1
          ? new QueryMock(
              { id: VALID_PAYMENT.bill_id, status: "belum_bayar" },
              null
            )
          : bills;
      },
      payments: () => payments,
    });

    const parsed = readSavePaymentInput(formData(VALID_PAYMENT));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await recordPaymentRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    const insertCall = payments.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.bill_id).toBe(VALID_PAYMENT.bill_id);
    expect(payload.status).toBe("menunggu");
    expect(payload.dicatat_oleh).toBe("user-1");
    expect(bills.calls.some((c) => c.startsWith("update:"))).toBe(true);
  });

  it("menolak pembayaran untuk tagihan lunas", async () => {
    const supabase = makeSupabase({
      bills: () =>
        new QueryMock({ id: VALID_PAYMENT.bill_id, status: "lunas" }, null),
      payments: () => new QueryMock(),
    });

    const parsed = readSavePaymentInput(formData(VALID_PAYMENT));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await recordPaymentRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah lunas");
    }
  });
});

describe("verifyPaymentRecord (service)", () => {
  it("verifikasi disetujui: payment terverifikasi dan bill lunas", async () => {
    const billId = VALID_PAYMENT.bill_id;
    const payments = new QueryMock();
    const bills = new QueryMock();
    const supabase = makeSupabase({
      payments: () => payments,
      bills: () => bills,
    });

    // Perlu data payment saat select single.
    payments.data = { id: "p-1", bill_id: billId, status: "menunggu" };

    const result = await verifyPaymentRecord(
      { supabase },
      makeUser(),
      { payment_id: "p-1", keputusan: "terverifikasi" }
    );

    expect(result.ok).toBe(true);
    const updateCalls = payments.calls.filter((c) => c.startsWith("update:"));
    expect(updateCalls.length).toBeGreaterThan(0);
    const updatePayload = JSON.parse(updateCalls[0].slice("update:".length));
    expect(updatePayload.status).toBe("terverifikasi");
    expect(updatePayload.diverifikasi_oleh).toBe("user-1");

    const billUpdate = bills.calls.find((c) => c.startsWith("update:"));
    expect(billUpdate).toBeDefined();
    expect(JSON.parse(billUpdate!.slice("update:".length)).status).toBe("lunas");
  });

  it("verifikasi ditolak: bill kembali belum_bayar", async () => {
    const billId = VALID_PAYMENT.bill_id;
    const payments = new QueryMock();
    const bills = new QueryMock();
    // Select payment (single) -> update payment -> select cek payment lain -> update bill
    let paymentsCall = 0;
    const supabase = makeSupabase({
      payments: () => {
        paymentsCall += 1;
        if (paymentsCall === 1) {
          return new QueryMock(
            { id: "p-1", bill_id: billId, status: "menunggu" },
            null
          );
        }
        if (paymentsCall === 3) {
          // cek payment lain terverifikasi -> tidak ada
          return new QueryMock([], null);
        }
        return payments; // update payment
      },
      bills: () => bills,
    });

    const result = await verifyPaymentRecord(
      { supabase },
      makeUser(),
      { payment_id: "p-1", keputusan: "ditolak" }
    );

    expect(result.ok).toBe(true);
    const billUpdate = bills.calls.find((c) => c.startsWith("update:"));
    expect(billUpdate).toBeDefined();
    expect(JSON.parse(billUpdate!.slice("update:".length)).status).toBe(
      "belum_bayar"
    );
  });

  it("menolak payment yang sudah diproses", async () => {
    const supabase = makeSupabase({
      payments: () =>
        new QueryMock(
          { id: "p-1", bill_id: "x", status: "terverifikasi" },
          null
        ),
      bills: () => new QueryMock(),
    });

    const result = await verifyPaymentRecord(
      { supabase },
      makeUser(),
      { payment_id: "p-1", keputusan: "terverifikasi" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah diproses");
    }
  });
});

describe("deleteBillRecord (service)", () => {
  it("menghapus tagihan belum lunas dengan filter school_id", async () => {
    let billsCall = 0;
    const bills = new QueryMock();
    const supabase = makeSupabase({
      bills: () => {
        billsCall += 1;
        if (billsCall === 1) {
          return new QueryMock({ id: "b-1", status: "belum_bayar" }, null);
        }
        return bills;
      },
    });

    const result = await deleteBillRecord({ supabase }, makeUser(), "b-1");

    expect(result.ok).toBe(true);
    expect(bills.calls.some((c) => c === "eq:id=b-1")).toBe(true);
    expect(bills.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
    expect(bills.calls.some((c) => c === "delete")).toBe(true);
  });

  it("menolak menghapus tagihan lunas", async () => {
    const supabase = makeSupabase({
      bills: () =>
        new QueryMock({ id: "b-1", status: "lunas" }, null),
    });

    const result = await deleteBillRecord({ supabase }, makeUser(), "b-1");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tidak dapat dihapus");
    }
  });
});
