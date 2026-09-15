import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  saveMasterRecord,
  deleteMasterRecord,
  listMaster,
} from "@/features/master/service";
import type { CurrentUser } from "@/lib/types";
import { serverError } from "@/lib/errors";

vi.mock("@/lib/errors", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/errors")>();
  return {
    ...original,
    serverError: (error: unknown, fallback: string) => fallback,
  };
});

type Row = { data?: unknown; error?: unknown };

class QueryMock implements PromiseLike<Row> {
  data: unknown;
  error: unknown;
  calls: string[] = [];

  constructor(data: unknown = null, error: unknown = null) {
    this.data = data;
    this.error = error;
  }
  select() {
    this.calls.push("select");
    return this;
  }
  eq(column: string, value: unknown) {
    this.calls.push(`eq:${column}=${String(value)}`);
    return this;
  }
  order() {
    this.calls.push("order");
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
    return Promise.resolve<Row>({ data: this.data, error: this.error }).then(
      onfulfilled,
      onrejected
    );
  }
}

function makeUser(
  overrides: Partial<CurrentUser> = {}
): CurrentUser {
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
    ...overrides,
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

describe("saveMasterRecord (service)", () => {
  it("menambahkan baris baru dengan school_id dari user login", async () => {
    const jabatan = new QueryMock();
    const supabase = makeSupabase({ jabatan: () => jabatan });

    const result = await saveMasterRecord(
      { supabase },
      makeUser(),
      "jabatan",
      null,
      { nama_jabatan: "Wali Kelas", kategori: "fungsional" }
    );

    expect(result.ok).toBe(true);
    const insertCall = jabatan.calls.find((call) => call.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.nama_jabatan).toBe("Wali Kelas");
  });

  it("memperbarui hanya baris milik sekolah yang sedang login", async () => {
    const jabatan = new QueryMock();
    const supabase = makeSupabase({ jabatan: () => jabatan });

    const result = await saveMasterRecord(
      { supabase },
      makeUser(),
      "jabatan",
      "row-1",
      { nama_jabatan: "Kepala Urusan" }
    );

    expect(result.ok).toBe(true);
    expect(jabatan.calls.some((c) => c === "eq:id=row-1")).toBe(true);
    expect(jabatan.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak user tanpa school_id (super admin platform)", async () => {
    const supabase = makeSupabase({});
    const user = makeUser();
    user.profile.school_id = null;

    const result = await saveMasterRecord(
      { supabase },
      user,
      "jabatan",
      null,
      { nama_jabatan: "Guru" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });

  it("memberi pesan ramah saat duplikat", async () => {
    const jabatan = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "uq_jabatan_tenant"',
    });
    const supabase = makeSupabase({ jabatan: () => jabatan });

    const result = await saveMasterRecord(
      { supabase },
      makeUser(),
      "jabatan",
      null,
      { nama_jabatan: "Guru", kategori: "fungsional" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah ada");
    }
  });
});

describe("deleteMasterRecord (service)", () => {
  it("menghapus dengan filter school_id", async () => {
    const mapel = new QueryMock();
    const supabase = makeSupabase({ mapel: () => mapel });

    const result = await deleteMasterRecord(
      { supabase },
      makeUser(),
      "mapel",
      "row-9"
    );

    expect(result.ok).toBe(true);
    expect(mapel.calls.some((c) => c === "eq:id=row-9")).toBe(true);
    expect(mapel.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak menghapus bila masih dipakai tabel lain", async () => {
    const mapel = new QueryMock(null, {
      code: "23503",
      message: "update or delete on table violates foreign key constraint",
    });
    const supabase = makeSupabase({ mapel: () => mapel });

    const result = await deleteMasterRecord(
      { supabase },
      makeUser(),
      "mapel",
      "row-9"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("masih dipakai");
    }
  });
});

describe("listMaster (service)", () => {
  it("mengembalikan baris dan error null saat sukses", async () => {
    const rows = [{ id: "a", nama_status: "PNS" }];
    const status = new QueryMock(rows);
    const supabase = makeSupabase({ status_kepegawaian: () => status });

    const result = await listMaster(supabase, "status_kepegawaian", "school-1");

    expect(result.rows).toEqual(rows);
    expect(result.error).toBeNull();
    expect(status.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("mengembalikan error saat query gagal", async () => {
    serverError; // pastikan module ter-mock
    const status = new QueryMock(null, { message: "RLS blocked" });
    const supabase = makeSupabase({ status_kepegawaian: () => status });

    const result = await listMaster(supabase, "status_kepegawaian", "school-1");

    expect(result.rows).toEqual([]);
    expect(result.error).toContain("Gagal memuat");
  });
});
