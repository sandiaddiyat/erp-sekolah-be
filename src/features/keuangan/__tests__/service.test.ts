import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  createBillRecord,
  deleteBillItemRecord,
  deleteBillRecord,
  recordPaymentRecord,
  saveBillItemRecord,
  verifyPaymentRecord,
} from "@/features/keuangan/service";
import {
  readSaveBillInput,
  readSaveBillItemInput,
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

  it("menerima diskon dan keterangan beasiswa", () => {
    const result = readSaveBillInput(
      formData({ ...VALID_BILL, diskon: "50000", diskon_keterangan: "Beasiswa Yayasan" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.diskon).toBe(50000);
      expect(result.command.diskon_keterangan).toBe("Beasiswa Yayasan");
    }
  });

  it("diskon kosong menjadi 0", () => {
    const result = readSaveBillInput(formData(VALID_BILL));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.diskon ?? 0).toBe(0);
    }
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
              { id: VALID_PAYMENT.bill_id, status: "belum_bayar", nominal: 150000, diskon: 0 },
              null
            )
          : bills;
      },
      payments: () => {
        // Panggilan pertama: cek total terverifikasi; kedua: insert payment.
        return payments;
      },
    });
    // Tidak ada pembayaran terverifikasi sebelumnya.
    payments.data = [];

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
        new QueryMock({ id: VALID_PAYMENT.bill_id, status: "lunas", nominal: 150000, diskon: 0 }, null),
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

  it("menolak pembayaran melebihi sisa tagihan", async () => {
    let billCall = 0;
    const supabase = makeSupabase({
      bills: () => {
        billCall += 1;
        return new QueryMock(
          { id: VALID_PAYMENT.bill_id, status: "cicilan", nominal: 150000, diskon: 0 },
          null
        );
      },
      payments: () => {
        // Cek pembayaran terverifikasi: sudah terbayar 100000.
        return new QueryMock([{ nominal: 100000 }], null);
      },
    });

    const parsed = readSavePaymentInput(
      formData({ ...VALID_PAYMENT, nominal: "100000" })
    );
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await recordPaymentRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("melebihi sisa");
    }
  });

  it("menerima cicilan yang tidak melebihi sisa", async () => {
    const payments = new QueryMock();
    const supabase = makeSupabase({
      bills: () =>
        new QueryMock(
          { id: VALID_PAYMENT.bill_id, status: "cicilan", nominal: 150000, diskon: 0 },
          null
        ),
      payments: () => {
        // Cek terverifikasi -> 100000, lalu insert.
        return payments;
      },
    });
    // Pertama select sisa -> [100000], kemudian insert pakai instance sama.
    let call = 0;
    const factory = makeSupabase({
      payments: () => {
        call += 1;
        return call === 1
          ? new QueryMock([{ nominal: 100000 }], null)
          : payments;
      },
      bills: () =>
        new QueryMock(
          { id: VALID_PAYMENT.bill_id, status: "cicilan", nominal: 150000, diskon: 0 },
          null
        ),
    });

    const parsed = readSavePaymentInput(
      formData({ ...VALID_PAYMENT, nominal: "50000" })
    );
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await recordPaymentRecord({ supabase: factory }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    const insertCall = payments.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.nominal).toBe(50000);
  });
});

describe("verifyPaymentRecord (service)", () => {
  /** Skema mock: select payment -> update payment -> select semua payments -> select bill. */
  function verifyMock(opts: {
    payment: unknown;
    semuaPayments: unknown;
    bill: unknown;
  }) {
    const payments = new QueryMock();
    const billInstances: QueryMock[] = [];
    let paymentsCall = 0;
    return {
      payments,
      get bills(): QueryMock {
        return {
          get calls(): string[] {
            return billInstances.flatMap((b) => b.calls);
          },
        } as QueryMock;
      },
      supabase: makeSupabase({
        payments: () => {
          paymentsCall += 1;
          if (paymentsCall === 1) return new QueryMock(opts.payment, null);
          if (paymentsCall === 3) return new QueryMock(opts.semuaPayments, null);
          return payments; // update payment
        },
        bills: () => {
          const instance = new QueryMock(opts.bill, null);
          billInstances.push(instance);
          return instance;
        },
      }),
    };
  }

  it("verifikasi disetujui: payment terverifikasi dan bill lunas", async () => {
    const { supabase, payments, bills } = verifyMock({
      payment: { id: "p-1", bill_id: "b-1", status: "menunggu", nominal: 150000 },
      // Setelah update: total terverifikasi 150000 = total tagihan -> lunas.
      semuaPayments: [{ nominal: 150000, status: "terverifikasi" }],
      bill: { nominal: 150000, diskon: 0 },
    });

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
    const { supabase, bills } = verifyMock({
      payment: { id: "p-1", bill_id: "b-1", status: "menunggu", nominal: 150000 },
      // Tidak ada pembayaran terverifikasi lain.
      semuaPayments: [],
      bill: { nominal: 150000, diskon: 0 },
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

  it("cicilan parsial: bill jadi cicilan, belum lunas", async () => {
    const { supabase, bills } = verifyMock({
      payment: { id: "p-1", bill_id: "b-1", status: "menunggu", nominal: 50000 },
      // Setelah update ini: p-1 jadi terverifikasi 50000 dari total 150000.
      semuaPayments: [{ nominal: 50000, status: "terverifikasi" }],
      bill: { nominal: 150000, diskon: 0 },
    });

    const result = await verifyPaymentRecord(
      { supabase },
      makeUser(),
      { payment_id: "p-1", keputusan: "terverifikasi" }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("cicilan");
    }
    const billUpdate = bills.calls.find((c) => c.startsWith("update:"));
    expect(billUpdate).toBeDefined();
    expect(JSON.parse(billUpdate!.slice("update:".length)).status).toBe("cicilan");
  });

  it("cicilan terakhir: total terverifikasi >= total setelah diskon -> lunas", async () => {
    const { supabase, bills } = verifyMock({
      payment: { id: "p-2", bill_id: "b-1", status: "menunggu", nominal: 50000 },
      // p-1 (100000) + p-2 (50000) = 150000 = total tagihan.
      semuaPayments: [
        { nominal: 100000, status: "terverifikasi" },
        { nominal: 50000, status: "terverifikasi" },
      ],
      bill: { nominal: 150000, diskon: 0 },
    });

    const result = await verifyPaymentRecord(
      { supabase },
      makeUser(),
      { payment_id: "p-2", keputusan: "terverifikasi" }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("lunas");
    }
    const billUpdate = bills.calls.find((c) => c.startsWith("update:"));
    expect(billUpdate).toBeDefined();
    expect(JSON.parse(billUpdate!.slice("update:".length)).status).toBe("lunas");
  });

  it("diskon diperhitungkan: 100000 tagihan dengan diskon 50000 lunas setelah bayar 50000", async () => {
    const { supabase, bills } = verifyMock({
      payment: { id: "p-1", bill_id: "b-1", status: "menunggu", nominal: 50000 },
      semuaPayments: [{ nominal: 50000, status: "terverifikasi" }],
      bill: { nominal: 100000, diskon: 50000 },
    });

    const result = await verifyPaymentRecord(
      { supabase },
      makeUser(),
      { payment_id: "p-1", keputusan: "terverifikasi" }
    );

    expect(result.ok).toBe(true);
    const billUpdate = bills.calls.find((c) => c.startsWith("update:"));
    expect(billUpdate).toBeDefined();
    expect(JSON.parse(billUpdate!.slice("update:".length)).status).toBe("lunas");
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

describe("saveBillItemRecord (service)", () => {
  const VALID_ITEM = {
    nama_item: "SPP Bulanan",
    nominal: "150000",
    frekuensi: "bulanan",
  };

  it("menerima jenis tagihan lengkap", () => {
    const result = readSaveBillItemInput(
      formData(VALID_ITEM)
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.nominal).toBe(150000);
      expect(result.command.frekuensi).toBe("bulanan");
    }
  });

  it("menambahkan jenis tagihan dengan school_id dari user login", async () => {
    const billItems = new QueryMock();
    const supabase = makeSupabase({ bill_items: () => billItems });

    const parsed = readSaveBillItemInput(formData(VALID_ITEM));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await saveBillItemRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    const insertCall = billItems.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.nama_item).toBe("SPP Bulanan");
  });

  it("memperbarui jenis tagihan milik sekolah yang sedang login", async () => {
    const billItems = new QueryMock();
    const supabase = makeSupabase({ bill_items: () => billItems });

    const parsed = readSaveBillItemInput(
      formData({ ...VALID_ITEM, id: "44444444-4444-4444-8444-444444444444" })
    );
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await saveBillItemRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    expect(billItems.calls.some((c) => c === "eq:id=44444444-4444-4444-8444-444444444444")).toBe(true);
    expect(billItems.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("memberi pesan ramah saat nama jenis duplikat", async () => {
    const billItems = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "uq_bill_items_tenant"',
    });
    const supabase = makeSupabase({ bill_items: () => billItems });

    const parsed = readSaveBillItemInput(formData(VALID_ITEM));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await saveBillItemRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah ada");
    }
  });
});

describe("deleteBillItemRecord (service)", () => {
  it("menghapus jenis tagihan dengan filter school_id", async () => {
    const billItems = new QueryMock();
    const supabase = makeSupabase({ bill_items: () => billItems });

    const result = await deleteBillItemRecord({ supabase }, makeUser(), "item-1");

    expect(result.ok).toBe(true);
    expect(billItems.calls.some((c) => c === "eq:id=item-1")).toBe(true);
    expect(billItems.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});
