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
  in(column: string, values: unknown[]) {
    this.calls.push(`in:${column}=${JSON.stringify(values)}`);
    return this;
  }
  select(columns: string) {
    this.calls.push(`select:${columns}`);
    return this;
  }
  single() {
    this.calls.push("single");
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

/**
 * Supabase mock yang memberikan QueryMock berikutnya dari antrean per tabel
 * (service memanggil from() berkali-kali untuk sinkronisasi pegawai_jabatan).
 */
function makeSupabase(
  queues: Record<string, QueryMock[]>
): SupabaseClient<Database> {
  const cursors: Record<string, number> = {};
  return {
    from: (table: string) => {
      const queue = queues[table];
      if (!queue) throw new Error(`Tabel tak terduga: ${table}`);
      const index = cursors[table] ?? 0;
      cursors[table] = index + 1;
      const mock = queue[index];
      if (!mock) throw new Error(`Mock antrean habis: ${table}`);
      return mock;
    },
  } as unknown as SupabaseClient<Database>;
}

function pegawaiFormData(
  entries: Record<string, string | string[]>
): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    if (Array.isArray(value)) {
      for (const item of value) fd.append(key, item);
    } else {
      fd.append(key, value);
    }
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
      expect(result.command.jabatan_ids).toEqual([]);
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

  it("menolak jabatan utama tidak dipilih padahal ada jabatan", () => {
    const result = readSavePegawaiInput(pegawaiFormData({
      ...VALID_FORM,
      jabatan_ids: ["11111111-1111-1111-8111-111111111111"],
    }));
    expect(result.ok).toBe(false);
  });

  it("menolak jabatan utama di luar daftar jabatan", () => {
    const result = readSavePegawaiInput(pegawaiFormData({
      ...VALID_FORM,
      jabatan_ids: ["11111111-1111-1111-8111-111111111111"],
      jabatan_utama_id: "22222222-2222-2222-8222-222222222222",
    }));
    expect(result.ok).toBe(false);
  });

  it("menerima jabatan utama anggota daftar jabatan", () => {
    const utama = "11111111-1111-1111-8111-111111111111";
    const result = readSavePegawaiInput(pegawaiFormData({
      ...VALID_FORM,
      jabatan_ids: [utama, "22222222-2222-2222-8222-222222222222"],
      jabatan_utama_id: utama,
    }));
    expect(result.ok).toBe(true);
  });
});

describe("savePegawaiRecord (service)", () => {
  it("menambahkan pegawai dengan school_id dari user login", async () => {
    const pegawaiInsert = new QueryMock({ id: "pegawai-1" });
    const supabase = makeSupabase({
      pegawai: [pegawaiInsert],
      pegawai_jabatan: [
        new QueryMock([]),
        new QueryMock(),
        new QueryMock(),
        new QueryMock(),
      ],
    });

    const parsed = readSavePegawaiInput(pegawaiFormData(VALID_FORM));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await savePegawaiRecord(
      { supabase },
      makeUser(),
      parsed.command
    );

    expect(result.ok).toBe(true);
    const insertCall = pegawaiInsert.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.full_name).toBe("Ahmad Fauzi");
    expect(payload.jenis_kelamin).toBe("L");
 expect(pegawaiInsert.calls.some((c) => c === "select:id")).toBe(true);
    expect(pegawaiInsert.calls.some((c) => c === "single")).toBe(true);
  });

  it("menyimpan pegawai dengan 2 jabatan (1 utama) ke pivot", async () => {
    const utama = "11111111-1111-1111-8111-111111111111";
    const kedua = "22222222-2222-2222-8222-222222222222";
    const pegawaiInsert = new QueryMock({ id: "pegawai-1" });
    const pivotInsert = new QueryMock();
    const pivotReset = new QueryMock();
    const pivotUtama = new QueryMock();
    const supabase = makeSupabase({
      pegawai: [pegawaiInsert],
      pegawai_jabatan: [
        new QueryMock([]),
        pivotInsert,
        pivotReset,
        pivotUtama,
      ],
    });

    const parsed = readSavePegawaiInput(
      pegawaiFormData({
        ...VALID_FORM,
        jabatan_ids: [utama, kedua],
        jabatan_utama_id: utama,
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await savePegawaiRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).not.toContain("gagal");
    }

    const insertCall = pivotInsert.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const rows = JSON.parse(insertCall!.slice("insert:".length)) as {
      jabatan_id: string;
      is_utama: boolean;
    }[];
    expect(rows).toHaveLength(2);
    const utamaRow = rows.find((r) => r.jabatan_id === utama);
    const keduaRow = rows.find((r) => r.jabatan_id === kedua);
    expect(utamaRow?.is_utama).toBe(true);
    expect(keduaRow?.is_utama).toBe(false);

    expect(pivotUtama.calls.some((c) => c === "update:{\"is_utama\":true}")).toBe(true);
    expect(pivotUtama.calls.some((c) => c === `eq:jabatan_id=${utama}`)).toBe(true);

    // Kolom lama tetap terisi dari jabatan utama.
    const pegawaiCall = pegawaiInsert.calls.find((c) => c.startsWith("insert:"));
    const pegawaiPayload = JSON.parse(pegawaiCall!.slice("insert:".length));
    expect(pegawaiPayload.jabatan_id).toBe(utama);
  });

  it("memperbarui hanya baris milik sekolah yang sedang login", async () => {
    const utama = "11111111-1111-1111-8111-111111111111";
    const pegawaiUpdate = new QueryMock();
    const supabase = makeSupabase({
      pegawai: [pegawaiUpdate],
      pegawai_jabatan: [
        new QueryMock([]),
        new QueryMock(),
        new QueryMock(),
        new QueryMock(),
      ],
    });

    const parsed = readSavePegawaiInput(
      pegawaiFormData({
        ...VALID_FORM,
        id: "11111111-1111-1111-8111-111111111111",
        full_name: "Ahmad Fauzi, S.Pd",
        jabatan_ids: [utama],
        jabatan_utama_id: utama,
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
    expect(pegawaiUpdate.calls.some((c) => c === "eq:id=11111111-1111-1111-8111-111111111111")).toBe(true);
    expect(pegawaiUpdate.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menghapus jabatan lama dan menambah jabatan baru saat ubah", async () => {
    const baru = "33333333-3333-3333-8333-333333333333";
    const pegawaiUpdate = new QueryMock();
    const pivotDelete = new QueryMock();
    const pivotInsert = new QueryMock();
    const pivotReset = new QueryMock();
    const pivotUtama = new QueryMock();
    const supabase = makeSupabase({
      pegawai: [pegawaiUpdate],
      pegawai_jabatan: [
        // select existing: masih punya jabatan lama j-lama
        new QueryMock([
          { id: "pivot-1", jabatan_id: "j-lama" },
        ]),
        pivotDelete,
        pivotInsert,
        pivotReset,
        pivotUtama,
      ],
    });

    const parsed = readSavePegawaiInput(
      pegawaiFormData({
        ...VALID_FORM,
        id: "11111111-1111-1111-8111-111111111111",
        jabatan_ids: [baru],
        jabatan_utama_id: baru,
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await savePegawaiRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);

    expect(
      pivotDelete.calls.some((c) => c === 'in:id=["pivot-1"]')
    ).toBe(true);

    const insertCall = pivotInsert.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const rows = JSON.parse(insertCall!.slice("insert:".length));
    expect(rows).toEqual([
      {
        school_id: "school-1",
        pegawai_id: "11111111-1111-1111-8111-111111111111",
        jabatan_id: baru,
        is_utama: true,
      },
    ]);
  });

  it("menghapus seluruh pivot bila daftar jabatan dikosongkan", async () => {
    const pegawaiUpdate = new QueryMock();
    const pivotDelete = new QueryMock();
    const pivotReset = new QueryMock();
    const supabase = makeSupabase({
      pegawai: [pegawaiUpdate],
      pegawai_jabatan: [
        new QueryMock([{ id: "pivot-1", jabatan_id: "j-lama" }]),
        pivotDelete,
        pivotReset,
      ],
    });

    const parsed = readSavePegawaiInput(
      pegawaiFormData({
        ...VALID_FORM,
        id: "11111111-1111-1111-8111-111111111111",
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await savePegawaiRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    expect(pivotDelete.calls.some((c) => c === 'in:id=["pivot-1"]')).toBe(true);
    // Payload pegawai tanpa jabatan: kolom lama null.
    const updateCall = pegawaiUpdate.calls.find((c) => c.startsWith("update:"));
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(updateCall!.slice("update:".length));
    expect(payload.jabatan_id).toBeNull();
  });

  it("tetap sukses dengan pesan peringatan bila sinkronisasi pivot gagal", async () => {
    const pegawaiUpdate = new QueryMock();
    const supabase = makeSupabase({
      pegawai: [pegawaiUpdate],
      pegawai_jabatan: [
        // select existing gagal
        new QueryMock(null, { message: "db error" }),
      ],
    });

    const parsed = readSavePegawaiInput(
      pegawaiFormData({
        ...VALID_FORM,
        id: "11111111-1111-1111-8111-111111111111",
      })
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const result = await savePegawaiRecord({ supabase }, makeUser(), parsed.command);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("gagal menyinkronkan jabatan");
    }
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
    const pegawaiInsert = new QueryMock(null, {
      code: "23505",
      message: 'duplicate key value violates unique constraint "pegawai_school_id_nip_key"',
    });
    const supabase = makeSupabase({
      pegawai: [pegawaiInsert],
      pegawai_jabatan: [new QueryMock([])],
    });

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
  it("menghapus pivot dulu lalu pegawai dengan filter school_id", async () => {
    const pivotDelete = new QueryMock();
    const pegawaiDelete = new QueryMock();
    const supabase = makeSupabase({
      pegawai_jabatan: [pivotDelete],
      pegawai: [pegawaiDelete],
    });

    const result = await deletePegawaiRecord({ supabase }, makeUser(), "row-7");

    expect(result.ok).toBe(true);
    expect(pivotDelete.calls.some((c) => c === "delete")).toBe(true);
    expect(pivotDelete.calls.some((c) => c === "eq:pegawai_id=row-7")).toBe(true);
    expect(pivotDelete.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
    expect(pegawaiDelete.calls.some((c) => c === "delete")).toBe(true);
    expect(pegawaiDelete.calls.some((c) => c === "eq:id=row-7")).toBe(true);
    expect(pegawaiDelete.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});
