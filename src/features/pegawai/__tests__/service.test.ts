import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  savePegawaiRecord,
  deletePegawaiRecord,
} from "@/features/pegawai/service";
import { readSavePegawaiInput } from "@/features/pegawai/schema";
import type { CurrentUser } from "@/lib/types";

vi.mock("@/lib/errors", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/errors")>();
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
  eq(column: string, value: unknown) {
    this.calls.push(`eq:${column}=${String(value)}`);
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

function pegawaiFormData(
  entries: Record<string, string>
): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

const VALID_FORM = {
  full_name: "Ahmad Fauzi",
  nip: "198001012005011001",
  jenis_kelamin: "L",
  is_active: "true",
};

describe("readSavePegawaiInput (schema)", () => {
  it("menerima data pegawai lengkap", () => {
    const result = readSavePegawaiInput(pegawaiFormData(VALID_FORM));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.full_name).toBe("Ahmad Fauzi");
      expect(result.command.is_active).toBe(true);
    }
  });

  it("menolak pegawai tanpa nomor induk apa pun", () => {
    const result = readSavePegawaiInput(
      pegawaiFormData({ full_name: "Tanpa NIP" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak nama terlalu pendek", () => {
    const result = readSavePegawaiInput(
      pegawaiFormData({ full_name: "A", nip: "123" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak email format salah", () => {
    const result = readSavePegawaiInput(
      pegawaiFormData({ ...VALID_FORM, email: "bukan-email" })
    );
    expect(result.ok).toBe(false);
  });
});

describe("savePegawaiRecord (service)", () => {
  it("menambahkan pegawai dengan school_id dari user login", async () => {
    const pegawai = new QueryMock();
    const supabase = makeSupabase({ pegawai: () => pegawai });

    const parsed = readSavePegawaiInput(pegawaiFormData(VALID_FORM));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await savePegawaiRecord(
      { supabase },
      makeUser(),
      parsed.command
    );

    expect(result.ok).toBe(true);
    const insertCall = pegawai.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.full_name).toBe("Ahmad Fauzi");
    expect(payload.jenis_kelamin).toBe("L");
  });

  it("memperbarui hanya baris milik sekolah yang sedang login", async () => {
    const pegawai = new QueryMock();
    const supabase = makeSupabase({ pegawai: () => pegawai });

    const parsed = readSavePegawaiInput(
      pegawaiFormData({
        ...VALID_FORM,
        id: "11111111-1111-1111-8111-111111111111",
        full_name: "Ahmad Fauzi, S.Pd",
      })
    );
    if (!parsed.ok) {
      throw new Error(
        "parse gagal: " + JSON.stringify((parsed as { error?: string }).error)
      );
    }
    expect(parsed.ok).toBe(true);

    const result = await savePegawaiRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    expect(pegawai.calls.some((c) => c === "eq:id=11111111-1111-1111-8111-111111111111")).toBe(true);
    expect(pegawai.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeSupabase({});
    const user = makeUser();
    user.profile.school_id = null;

    const parsed = readSavePegawaiInput(pegawaiFormData(VALID_FORM));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await savePegawaiRecord({ supabase }, user, parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });

  it("memberi pesan ramah saat NIP duplikat", async () => {
    const pegawai = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "pegawai_school_id_nip_key"',
    });
    const supabase = makeSupabase({ pegawai: () => pegawai });

    const parsed = readSavePegawaiInput(pegawaiFormData(VALID_FORM));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await savePegawaiRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah dipakai");
    }
  });
});

describe("deletePegawaiRecord (service)", () => {
  it("menghapus dengan filter school_id", async () => {
    const pegawai = new QueryMock();
    const supabase = makeSupabase({ pegawai: () => pegawai });

    const result = await deletePegawaiRecord({ supabase }, makeUser(), "row-7");

    expect(result.ok).toBe(true);
    expect(pegawai.calls.some((c) => c === "eq:id=row-7")).toBe(true);
    expect(pegawai.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});
