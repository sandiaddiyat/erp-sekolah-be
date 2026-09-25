// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrations = ["0029", "0030", "0031", "0032", "0033"].map((name) => {
  const fileName = {
    "0029": "0029_rls_hardening.sql",
    "0030": "0030_rls_relations_payments.sql",
    "0031": "0031_rls_payment_corrections.sql",
    "0032": "0032_payment_reference_integrity.sql",
    "0033": "0033_complete_tenant_foreign_keys.sql",
  }[name]!;
  return [name, readFileSync(path.resolve(process.cwd(), "supabase/migrations", fileName), "utf8")] as const;
});

const migration = Object.fromEntries(migrations) as Record<string, string>;

const protectedTables = [
  "academic_years",
  "education_levels",
  "grades",
  "majors",
  "rooms",
  "classes",
  "student_enrollments",
  "fee_categories",
  "fee_structures",
  "families",
  "guardians",
  "invoices",
  "invoice_details",
  "billing_run_logs",
  "discount_types",
  "student_discounts",
  "payment_methods",
  "bank_accounts",
] as const;

describe("RLS migrations issue #63", () => {
  it("mengaktifkan RLS dan membuat policy lengkap pada 0029", () => {
    for (const table of protectedTables) {
      expect(migration["0029"]).toContain(
        `alter table public.${table} enable row level security;`
      );
      for (const command of ["select", "insert", "update", "delete"]) {
        expect(migration["0029"]).toContain(
          `create policy ${table}_${command} on public.${table}`
        );
      }
    }
  });

  it("menutup helper policy dinamis", () => {
    expect(migration["0029"]).toContain(
      "revoke all on function public.grant_tenant_policies(text, text, text) from public, anon, authenticated"
    );
    expect(migration["0029"]).toContain(
      "drop function if exists public.grant_tenant_policies(text, text, text);"
    );
    expect(migration["0029"]).not.toContain(
      "grant execute on function public.grant_tenant_policies"
    );
  });

  it("menambahkan tenant composite checks dan payment schema pada 0030", () => {
    expect(migration["0030"]).toContain("alter table public.invoice_details add column if not exists school_id uuid;");
    expect(migration["0030"]).toContain("alter column bill_id drop not null");
    expect(migration["0030"]).toContain("alter column metode drop not null");
    expect(migration["0030"]).toContain("add column if not exists payment_method_id uuid");
    expect(migration["0030"]).toContain("invoice_details_invoice_tenant_fkey");
    expect(migration["0030"]).toContain("payments_invoice_tenant_fkey");
  });

  it("membuat koreksi tenant dan payment policy idempotent pada 0031", () => {
    expect(migration["0031"]).toContain("if not exists");
    expect(migration["0031"]).toContain("bills_student_tenant_fkey");
    expect(migration["0031"]).toContain("bills_item_tenant_fkey");
    expect(migration["0031"]).toContain("create policy payments_insert on public.payments");
    expect(migration["0031"]).toContain("and invoice_id is null");
    expect(migration["0031"]).toContain("public.has_permission('billing.manage')");
  });

  it("mengunci referensi payments pada 0032", () => {
    expect(migration["0032"]).toContain("metode is not null");
    expect(migration["0032"]).toContain("metode is null");
    expect(migration["0032"]).toContain("drop constraint if exists payments_reference_check");
  });

  it("melengkapi composite tenant FK pada 0033", () => {
    expect(migration["0033"]).toContain("grades_education_level_tenant_fkey");
    expect(migration["0033"]).toContain("majors_education_level_tenant_fkey");
    expect(migration["0033"]).toContain("student_discounts_approver_tenant_fkey");
    expect(migration["0033"]).toContain("if not exists");
  });

  it("memakai permission dan current_access_ok pada policy RLS", () => {
    expect(migration["0029"]).toContain("public.current_access_ok()");
    expect(migration["0029"]).toContain("public.has_permission('academics.view')");
    expect(migration["0029"]).toContain("public.has_permission('billing.manage')");
    expect(migration["0029"]).toContain("public.has_permission('discount.manage')");
  });
});
