import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { saveSiswaRecord, deleteSiswaRecord } from "@/features/siswa/service";
import { readSaveSiswaInput } from "@/features/siswa/schema";
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

function siswaFormData(
  entries: Record<string, string>
): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

const VALID_FORM = {
  nama_lengkap: "Budi Santoso",
  nis: "20240001",
  jenis_kelamin: "L",
};

describe("readSaveSiswaInput (schema)", () => {
  it("menerima data siswa lengkap", () => {
    const result = readSaveSiswaInput(siswaFormData(VALID_FORM));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.nama_lengkap).toBe("Budi Santoso");
      expect(result.command.status).toBe("aktif");
    }
  });

  it("menolak siswa tanpa NIS maupun NISN", () => {
    const result = readSaveSiswaInput(
      siswaFormData({ nama_lengkap: "Tanpa No" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak nama terlalu pendek", () => {
    const result = readSaveSiswaInput(
      siswaFormData({ nama_lengkap: "A", nis: "123" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak status tidak valid", () => {
    const result = readSaveSiswaInput(
      siswaFormData({ ...VALID_FORM, status: "pensi" })
    );
    expect(result.ok).toBe(false);
  });
});

describe("saveSiswaRecord (service)", () => {
  it("menambahkan siswa dengan school_id dari user login", async () => {
    const students = new QueryMock();
    const supabase = makeSupabase({ students: () => students });

    const parsed = readSaveSiswaInput(siswaFormData(VALID_FORM));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await saveSiswaRecord(
      { supabase },
      makeUser(),
      parsed.command
    );

    expect(result.ok).toBe(true);
    const insertCall = students.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.nama_lengkap).toBe("Budi Santoso");
    expect(payload.nis).toBe("20240001");
  });

  it("memperbarui hanya baris milik sekolah yang sedang login", async () => {
    const students = new QueryMock();
    const supabase = makeSupabase({ students: () => students });

    const parsed = readSaveSiswaInput(
      siswaFormData({
        ...VALID_FORM,
        id: "11111111-1111-1111-8111-111111111111",
        nama_lengkap: "Budi Santoso, S.Pd",
      })
    );
    if (!parsed.ok) throw new Error("parse gagal");

    expect(parsed.ok).toBe(true);

    const result = await saveSiswaRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    expect(students.calls.some((c) => c === "eq:id=11111111-1111-1111-8111-111111111111")).toBe(true);
    expect(students.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeSupabase({});
    const user = makeUser();
    user.profile.school_id = null;

    const parsed = readSaveSiswaInput(siswaFormData(VALID_FORM));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await saveSiswaRecord({ supabase }, user, parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });

  it("memberi pesan ramah saat NIS duplikat", async () => {
    const students = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "students_school_id_nis_key"',
    });
    const supabase = makeSupabase({ students: () => students });

    const parsed = readSaveSiswaInput(siswaFormData(VALID_FORM));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await saveSiswaRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("NIS");
    }
  });

  it("memberi pesan ramah saat NISN duplikat", async () => {
    const students = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "students_school_id_nisn_key"',
    });
    const supabase = makeSupabase({ students: () => students });

    const parsed = readSaveSiswaInput(siswaFormData(VALID_FORM));
    if (!parsed.ok) throw new Error("parse gagal");

    const result = await saveSiswaRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("NISN");
    }
  });
});

describe("deleteSiswaRecord (service)", () => {
  it("menghapus dengan filter school_id", async () => {
    const students = new QueryMock();
    const supabase = makeSupabase({ students: () => students });

    const result = await deleteSiswaRecord({ supabase }, makeUser(), "row-7");

    expect(result.ok).toBe(true);
    expect(students.calls.some((c) => c === "eq:id=row-7")).toBe(true);
    expect(students.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});
