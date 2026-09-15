import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  saveSchoolRecord,
  setSchoolStatusRecord,
  type SchoolMutationsDeps,
} from "@/features/schools/service";
import type { CurrentUser, SchoolStatus } from "@/lib/types";
import type { SaveSchoolCommand } from "@/features/schools/schema";

type Row = { data?: unknown; error?: unknown; count?: number };

/**
 * Mock Supabase client: tiap tabel mengembalikan { data, error } yang sudah
 * dikonfigurasi. Query builder bersifat chainable dan then-able. Tidak menyentuh
 * database sungguhan.
 */
class QueryMock implements PromiseLike<Row> {
  data: unknown;
  error: unknown;
  count?: number;

  constructor(data: unknown = null, error: unknown = null, count?: number) {
    this.data = data;
    this.error = error;
    this.count = count;
  }
  select() { return this; }
  eq() { return this; }
  in() { return this; }
  like() { return this; }
  maybeSingle() { return this; }
  single() { return this; }
  order() { return this; }
  insert() { return this; }
  update() { return this; }
  delete() { return this; }
  head() { return this; }
  then<TResult1 = Row, TResult2 = never>(
    onfulfilled?: ((value: Row) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve<Row>({
      data: this.data,
      error: this.error,
      count: this.count,
    }).then(onfulfilled, onrejected);
  }
}

function makeSupabase(
  tableRows: Record<string, Row>,
  counts: Record<string, number> = {},
  rpcResult: unknown = null,
  rpcError: unknown = null
): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      const row = tableRows[table] ?? { data: null, error: null };
      return new QueryMock(row.data, row.error, counts[table]);
    },
    rpc: () => Promise.resolve({ data: rpcResult, error: rpcError }),
  } as unknown as SupabaseClient<Database>;
}

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "user-1",
    email: "super@test.com",
    profile: {
      id: "user-1",
      school_id: null,
      full_name: "Super Admin",
      email: "super@test.com",
      phone: null,
      avatar_url: null,
      jabatan: null,
      is_active: true,
      is_super_admin: true,
      last_login_at: null,
      created_at: "2024-01-01",
      updated_at: "2024-01-01",
    },
    school: null,
    roles: [],
    permissions: [],
    isSuperAdmin: true,
    ...overrides,
  };
}

describe("saveSchoolRecord (service)", () => {
  it("membuat sekolah baru sukses via rpc", async () => {
    const supabase = makeSupabase(
      { school_notes: { data: null, error: null } },
      {},
      "school-123" // rpc result
    );

    const deps: SchoolMutationsDeps = {
      supabase,
      createAdmin: () => ({ auth: { admin: { createUser: () => Promise.resolve({ data: null, error: null }) } } }) as unknown as SupabaseClient<Database>,
    };

    const user = makeUser({ isSuperAdmin: true });

    const command: SaveSchoolCommand = {
      name: "SMP Test",
      status: "trial",
      slug: "smp-test",
      create_admin: false,
      email: null,
      active_until: null,
    };

    const result = await saveSchoolRecord(deps, command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("berhasil didaftarkan");
    }
  });

  it("gagal membuat sekolah karena slug duplikat (rpc error 23505)", async () => {
    const supabase = makeSupabase(
      {},
      {},
      null,
      { code: "23505", message: "duplicate key value" }
    );

    const deps: SchoolMutationsDeps = { supabase, createAdmin: () => ({}) as unknown as SupabaseClient<Database> };
    const user = makeUser({ isSuperAdmin: true });

    const command: SaveSchoolCommand = {
      name: "SMP Duplikat",
      status: "trial",
      create_admin: false,
      email: null,
      active_until: null,
    };

    const result = await saveSchoolRecord(deps, command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah dipakai");
    }
  });

  it("gagal update sekolah yang tidak ditemukan", async () => {
    const supabase = makeSupabase({ schools: { data: null, error: null } });
    const deps: SchoolMutationsDeps = { supabase, createAdmin: () => ({}) as unknown as SupabaseClient<Database> };
    const user = makeUser({ isSuperAdmin: true });

    const command: SaveSchoolCommand = {
      id: "nonexistent",
      name: "SMP Update",
      status: "active",
      create_admin: false,
      email: null,
      active_until: null,
    };

    const result = await saveSchoolRecord(deps, command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tidak ditemukan");
    }
  });
});

describe("setSchoolStatusRecord (service)", () => {
  it("mengubah status sekolah menjadi suspended", async () => {
    const supabase = makeSupabase({
      schools: { data: { id: "school-1", name: "SMP Test" }, error: null },
    });
    const deps: SchoolMutationsDeps = { supabase, createAdmin: () => ({}) as unknown as SupabaseClient<Database> };

    const result = await setSchoolStatusRecord({ supabase }, "school-1", "suspended");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("dihentikan sementara");
    }
  });

  it("mengembalikan error jika sekolah tidak ada", async () => {
    const supabase = makeSupabase({ schools: { data: null, error: null } });
    const result = await setSchoolStatusRecord({ supabase }, "ghost", "active");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tidak ditemukan");
    }
  });
});
