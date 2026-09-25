// @vitest-environment node

import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { recordInvoicePayment } from "@/features/payment-v2/service";
import type { CurrentUser } from "@/lib/types";

type Row = { data?: unknown; error?: unknown };

class QueryMock implements PromiseLike<Row> {
  data: unknown;
  error: unknown;
  calls: string[] = [];

  constructor(data: unknown = null, error: unknown = null) {
    this.data = data;
    this.error = error;
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
    this.calls.push("single");
    return this;
  }

  maybeSingle() {
    this.calls.push("maybeSingle");
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

  then<TResult1 = Row, TResult2 = never>(
    onfulfilled?: ((value: Row) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve<Row>({ data: this.data, error: this.error }).then(
      onfulfilled,
      onrejected
    );
  }
}

const invoiceId = "11111111-1111-4111-8111-111111111111";
const paymentMethodId = "22222222-2222-4222-8222-222222222222";

function makeUser(): CurrentUser {
  return {
    id: "user-1",
    email: "bendahara@school.test",
    profile: {
      id: "user-1",
      school_id: "school-1",
      full_name: "Bendahara",
      email: "bendahara@school.test",
      phone: null,
      avatar_url: null,
      jabatan: null,
      is_active: true,
      is_super_admin: false,
      last_login_at: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    school: null,
    roles: [],
    permissions: [],
    isSuperAdmin: false,
  };
}

function makeSupabase(options: {
  invoice?: { id: string; total_amount: number; status: string; school_id: string };
  method?: { id: string } | null;
  payments?: { nominal: number }[];
}) {
  const invoiceRead = new QueryMock(
    options.invoice ?? {
      id: invoiceId,
      total_amount: 150000,
      status: "sebagian",
      school_id: "school-1",
    }
  );
  const methodRead = new QueryMock(options.method === undefined ? { id: paymentMethodId } : options.method);
  const paymentsRead = new QueryMock(options.payments ?? []);
  const paymentInsert = new QueryMock();
  const invoiceUpdate = new QueryMock();
  let invoiceCalls = 0;
  let paymentCalls = 0;

  const supabase = {
    from(table: string) {
      if (table === "invoices") {
        invoiceCalls += 1;
        return invoiceCalls === 1 ? invoiceRead : invoiceUpdate;
      }
      if (table === "payment_methods") return methodRead;
      if (table === "payments") {
        paymentCalls += 1;
        return paymentCalls === 1 ? paymentsRead : paymentInsert;
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient<Database>;

  return {
    supabase,
    paymentInsert,
    invoiceUpdate,
  };
}

describe("recordInvoicePayment", () => {
  it("mencatat pembayaran invoice dengan metode dan tenant yang benar", async () => {
    const { supabase, paymentInsert, invoiceUpdate } = makeSupabase({});

    const result = await recordInvoicePayment(
      { supabase },
      makeUser(),
      {
        invoice_id: invoiceId,
        payment_method_id: paymentMethodId,
        nominal: 50000,
        catatan: "Transfer BCA",
      }
    );

    expect(result.ok).toBe(true);
    const insertCall = paymentInsert.calls.find((call) => call.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload).toMatchObject({
      school_id: "school-1",
      invoice_id: invoiceId,
      payment_method_id: paymentMethodId,
      nominal: 50000,
      status: "terverifikasi",
      dicatat_oleh: "user-1",
      diverifikasi_oleh: "user-1",
    });
    expect(payload.bill_id).toBeUndefined();
    expect(payload.metode).toBeUndefined();
    expect(invoiceUpdate.calls.some((call) => call === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak metode pembayaran yang tidak ditemukan di tenant", async () => {
    const { supabase, paymentInsert } = makeSupabase({ method: null });

    const result = await recordInvoicePayment(
      { supabase },
      makeUser(),
      {
        invoice_id: invoiceId,
        payment_method_id: paymentMethodId,
        nominal: 50000,
        catatan: undefined,
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Metode pembayaran tidak valid.");
    expect(paymentInsert.calls.some((call) => call.startsWith("insert:"))).toBe(false);
  });

  it("menolak nominal yang melebihi sisa tagihan", async () => {
    const { supabase, paymentInsert } = makeSupabase({
      invoice: {
        id: invoiceId,
        total_amount: 100000,
        status: "sebagian",
        school_id: "school-1",
      },
      payments: [{ nominal: 80000 }],
    });

    const result = await recordInvoicePayment(
      { supabase },
      makeUser(),
      {
        invoice_id: invoiceId,
        payment_method_id: paymentMethodId,
        nominal: 30000,
        catatan: undefined,
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("melebihi sisa");
    expect(paymentInsert.calls.some((call) => call.startsWith("insert:"))).toBe(false);
  });
});
