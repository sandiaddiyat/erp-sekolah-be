import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  saveAcademicYearRecord,
  deleteAcademicYearRecord,
  saveEducationLevelRecord,
  deleteEducationLevelRecord,
  saveGradeRecord,
  deleteGradeRecord,
  saveRoomRecord,
  deleteRoomRecord,
  saveMajorRecord,
  deleteMajorRecord,
  saveClassRecord,
  deleteClassRecord,
  copyClassesFromPreviousYear,
  saveEnrollmentRecord,
  deleteEnrollmentRecord,
} from "@/features/akademik/service";
import {
  readSaveAcademicYearInput,
  readSaveEducationLevelInput,
  readSaveGradeInput,
  readSaveRoomInput,
  readSaveMajorInput,
  readSaveClassInput,
  readCopyClassesInput,
  readSaveEnrollmentInput,
} from "@/features/akademik/schema";
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
  select(columns?: string) {
    this.calls.push(`select:${columns ?? ""}`);
    return this;
  }
  eq(column: string, value: unknown) {
    this.calls.push(`eq:${column}=${String(value)}`);
    return this;
  }
  neq(column: string, value: unknown) {
    this.calls.push(`neq:${column}=${String(value)}`);
    return this;
  }
  order() {
    this.calls.push("order");
    return this;
  }
  limit(count: number) {
    this.calls.push(`limit:${count}`);
    return this;
  }
  lt(column: string, value: unknown) {
    this.calls.push(`lt:${column}=${String(value)}`);
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

const UUID = "11111111-1111-4111-8111-111111111111";

function makeUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
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

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
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

// ===== Schema: Academic Years =====

describe("readSaveAcademicYearInput (schema)", () => {
  const VALID = { name: "2025/2026", start_date: "2025-07-01", end_date: "2026-06-30" };

  it("menerima tahun ajaran lengkap dengan is_active", () => {
    const result = readSaveAcademicYearInput(formData({ ...VALID, is_active: "true" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.name).toBe("2025/2026");
      expect(result.command.is_active).toBe(true);
      expect(result.command.status).toBe("draft");
    }
  });

  it("menolak nama terlalu pendek", () => {
    const result = readSaveAcademicYearInput(formData({ ...VALID, name: "AB" }));
    expect(result.ok).toBe(false);
  });

  it("menolak end_date sebelum start_date", () => {
    const result = readSaveAcademicYearInput(
      formData({ name: "2025/2026", start_date: "2026-06-30", end_date: "2025-07-01" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak format tanggal salah", () => {
    const result = readSaveAcademicYearInput(
      formData({ ...VALID, start_date: "01-07-2025" })
    );
    expect(result.ok).toBe(false);
  });

  it("menerima checkbox is_active via on/1/true", () => {
    expect(readSaveAcademicYearInput(formData({ ...VALID, is_active: "on" })).ok).toBe(true);
    expect(readSaveAcademicYearInput(formData({ ...VALID, is_active: "1" })).ok).toBe(true);
  });
});

// ===== Schema: Education Levels =====

describe("readSaveEducationLevelInput (schema)", () => {
  it("menerima jenjang lengkap", () => {
    const result = readSaveEducationLevelInput(formData({ code: "SD", name: "Sekolah Dasar" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.code).toBe("SD");
      expect(result.command.name).toBe("Sekolah Dasar");
    }
  });

  it("menolak kode kosong", () => {
    expect(readSaveEducationLevelInput(formData({ code: "", name: "SD" })).ok).toBe(false);
  });

  it("menolak nama kurang dari 2 karakter", () => {
    expect(readSaveEducationLevelInput(formData({ code: "SD", name: "X" })).ok).toBe(false);
  });
});

// ===== Schema: Grades =====

describe("readSaveGradeInput (schema)", () => {
  it("menerima tingkat lengkap dengan sort_order", () => {
    const result = readSaveGradeInput(
      formData({ education_level_id: UUID, name: "Kelas 1", sort_order: "3" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.sort_order).toBe(3);
      expect(result.command.name).toBe("Kelas 1");
    }
  });

  it("menolak tanpa education_level_id", () => {
    expect(readSaveGradeInput(formData({ name: "Kelas 1" })).ok).toBe(false);
  });

  it("menerima sort_order kosong → 0", () => {
    const result = readSaveGradeInput(
      formData({ education_level_id: UUID, name: "Kelas 1" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.sort_order).toBe(0);
    }
  });
});

// ===== Schema: Rooms =====

describe("readSaveRoomInput (schema)", () => {
  it("menerima ruangan lengkap", () => {
    const result = readSaveRoomInput(
      formData({ name: "Ruang 101", type: "Kelas", capacity: "30" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.name).toBe("Ruang 101");
      expect(result.command.type).toBe("Kelas");
      expect(result.command.capacity).toBe(30);
    }
  });

  it("kapasitas bukan angka → null", () => {
    const result = readSaveRoomInput(formData({ name: "Ruang 101", capacity: "abc" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.capacity).toBeNull();
    }
  });

  it("tipe kosong → undefined", () => {
    const result = readSaveRoomInput(formData({ name: "Ruang 101" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.type).toBeUndefined();
    }
  });
});

// ===== Schema: Majors =====

describe("readSaveMajorInput (schema)", () => {
  it("menerima jurusan lengkap", () => {
    const result = readSaveMajorInput(
      formData({ education_level_id: UUID, name: "IPA" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.name).toBe("IPA");
    }
  });

  it("menolak tanpa education_level_id", () => {
    expect(readSaveMajorInput(formData({ name: "IPA" })).ok).toBe(false);
  });
});

// ===== Schema: Classes =====

describe("readSaveClassInput (schema)", () => {
  it("menerima kelas lengkap dengan optional field", () => {
    const result = readSaveClassInput(
      formData({
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: UUID,
        room_id: UUID,
        homeroom_teacher_id: UUID,
        name: "Kelas 7A",
        capacity: "32",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.name).toBe("Kelas 7A");
      expect(result.command.capacity).toBe(32);
    }
  });

  it("menerima kelas tanpa optional field", () => {
    const result = readSaveClassInput(
      formData({ academic_year_id: UUID, grade_id: UUID, name: "Kelas 7A" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.major_id).toBeUndefined();
      expect(result.command.room_id).toBeUndefined();
    }
  });

  it("menolak tanpa academic_year_id", () => {
    expect(readSaveClassInput(formData({ grade_id: UUID, name: "7A" })).ok).toBe(false);
  });
});

// ===== Schema: Student Enrollments =====

describe("readSaveEnrollmentInput (schema)", () => {
  it("menerima pendaftaran lengkap", () => {
    const result = readSaveEnrollmentInput(
      formData({
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        exit_date: "2026-06-30",
        status: "lulus",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.status).toBe("lulus");
      expect(result.command.exit_date).toBe("2026-06-30");
    }
  });

  it("status default active", () => {
    const result = readSaveEnrollmentInput(
      formData({
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.status).toBe("active");
    }
  });

  it("menolak exit_date sebelum enrollment_date", () => {
    const result = readSaveEnrollmentInput(
      formData({
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        exit_date: "2025-06-01",
      })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak status tidak valid", () => {
    const result = readSaveEnrollmentInput(
      formData({
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        status: "invalid_status",
      })
    );
    expect(result.ok).toBe(false);
  });
});

// ===== Service: Academic Years =====

describe("saveAcademicYearRecord (service)", () => {
  it("menambahkan tahun ajaran dengan school_id dari user login", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ academic_years: () => table });

    const result = await saveAcademicYearRecord(
      { supabase },
      makeUser(),
       { id: undefined, name: "2025/2026", start_date: "2025-07-01", end_date: "2026-06-30", status: "draft", is_active: false }
    );

    expect(result.ok).toBe(true);
    const insertCall = table.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload.school_id).toBe("school-1");
    expect(payload.name).toBe("2025/2026");
  });

  it("memperbarui tahun ajaran yang ada", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ academic_years: () => table });

    const result = await saveAcademicYearRecord(
      { supabase },
      makeUser(),
      { id: UUID, name: "2025/2026", start_date: "2025-07-01", end_date: "2026-06-30", status: "active", is_active: true }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menonaktifkan tahun ajaran lain saat mengaktifkan", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ academic_years: () => table });

    const result = await saveAcademicYearRecord(
      { supabase },
      makeUser(),
      { id: UUID, name: "2025/2026", start_date: "2025-07-01", end_date: "2026-06-30", status: "active", is_active: true }
    );

    expect(result.ok).toBe(true);
    const updateCall = table.calls.find((c) => c.startsWith("update:"));
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(updateCall!.slice("update:".length));
    expect(payload.is_active).toBe(false);
    expect(payload.status).toBe("closed");
    expect(table.calls.some((c) => c === `neq:id=${UUID}`)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeSupabase({});
    const user = makeUser({ profile: { school_id: null } as never });

    const result = await saveAcademicYearRecord(
      { supabase },
      user,
       { id: undefined, name: "2025/2026", start_date: "2025-07-01", end_date: "2026-06-30", status: "draft", is_active: false }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });

  it("memberi pesan ramah saat duplikat", async () => {
    const table = new QueryMock(null, { code: "23505", message: "duplicate key" });
    const supabase = makeSupabase({ academic_years: () => table });

    const result = await saveAcademicYearRecord(
      { supabase },
      makeUser(),
       { id: undefined, name: "2025/2026", start_date: "2025-07-01", end_date: "2026-06-30", status: "draft", is_active: false }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah ada");
    }
  });
});

describe("deleteAcademicYearRecord (service)", () => {
  it("menghapus dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ academic_years: () => table });

    const result = await deleteAcademicYearRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeSupabase({});
    const user = makeUser({ profile: { school_id: null } as never });

    const result = await deleteAcademicYearRecord({ supabase }, user, UUID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });
});

// ===== Service: Education Levels =====

describe("saveEducationLevelRecord (service)", () => {
  it("menambahkan jenjang dengan school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ education_levels: () => table });

    const result = await saveEducationLevelRecord(
      { supabase },
      makeUser(),
       { id: undefined, code: "SD", name: "Sekolah Dasar" }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.code).toBe("SD");
  });

  it("memperbarui jenjang", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ education_levels: () => table });

    const result = await saveEducationLevelRecord(
      { supabase },
      makeUser(),
      { id: UUID, code: "SD", name: "Sekolah Dasar" }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("memberi pesan ramah saat duplikat", async () => {
    const table = new QueryMock(null, { code: "23505", message: "duplicate key" });
    const supabase = makeSupabase({ education_levels: () => table });

    const result = await saveEducationLevelRecord(
      { supabase },
      makeUser(),
       { id: undefined, code: "SD", name: "Sekolah Dasar" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah ada");
    }
  });
});

describe("deleteEducationLevelRecord (service)", () => {
  it("menghapus dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ education_levels: () => table });

    const result = await deleteEducationLevelRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});

// ===== Service: Grades =====

describe("saveGradeRecord (service)", () => {
  it("menambahkan tingkat dengan school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ grades: () => table });

    const result = await saveGradeRecord(
      { supabase },
      makeUser(),
       { id: undefined, education_level_id: UUID, name: "Kelas 1", sort_order: 0 }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.education_level_id).toBe(UUID);
    expect(payload.sort_order).toBe(0);
  });

  it("memperbarui tingkat", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ grades: () => table });

    const result = await saveGradeRecord(
      { supabase },
      makeUser(),
      { id: UUID, education_level_id: UUID, name: "Kelas 1", sort_order: 1 }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
  });
});

describe("deleteGradeRecord (service)", () => {
  it("menghapus tingkat dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ grades: () => table });

    const result = await deleteGradeRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "delete")).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});

// ===== Service: Rooms =====

describe("saveRoomRecord (service)", () => {
  it("menambahkan ruangan dengan school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ rooms: () => table });

    const result = await saveRoomRecord(
      { supabase },
      makeUser(),
       { id: undefined, name: "Ruang 101", type: "Kelas", capacity: 30 }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.name).toBe("Ruang 101");
    expect(payload.type).toBe("Kelas");
    expect(payload.capacity).toBe(30);
  });

  it("memperbarui ruangan", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ rooms: () => table });

    const result = await saveRoomRecord(
      { supabase },
      makeUser(),
      { id: UUID, name: "Ruang 102", type: undefined, capacity: null }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
  });
});

describe("deleteRoomRecord (service)", () => {
  it("menghapus ruangan dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ rooms: () => table });

    const result = await deleteRoomRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});

// ===== Service: Majors =====

describe("saveMajorRecord (service)", () => {
  it("menambahkan jurusan dengan school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ majors: () => table });

    const result = await saveMajorRecord(
      { supabase },
      makeUser(),
       { id: undefined, education_level_id: UUID, name: "IPA" }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.education_level_id).toBe(UUID);
  });

  it("memperbarui jurusan", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ majors: () => table });

    const result = await saveMajorRecord(
      { supabase },
      makeUser(),
      { id: UUID, education_level_id: UUID, name: "IPS" }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
  });

  it("memberi pesan ramah saat constraint violation", async () => {
    const table = new QueryMock(null, { code: "23503", message: "foreign key violation" });
    const supabase = makeSupabase({ majors: () => table });

    const result = await saveMajorRecord(
      { supabase },
      makeUser(),
       { id: undefined, education_level_id: UUID, name: "IPA" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tidak valid");
    }
  });
});

describe("deleteMajorRecord (service)", () => {
  it("menghapus jurusan dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ majors: () => table });

    const result = await deleteMajorRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});

// ===== Service: Classes =====

describe("saveClassRecord (service)", () => {
  it("menambahkan kelas dengan school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ classes: () => table });

    const result = await saveClassRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: UUID,
        room_id: UUID,
        homeroom_teacher_id: UUID,
        name: "Kelas 7A",
        capacity: 32,
      }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.name).toBe("Kelas 7A");
    expect(payload.capacity).toBe(32);
  });

  it("memperbarui kelas", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ classes: () => table });

    const result = await saveClassRecord(
      { supabase },
      makeUser(),
      {
        id: UUID,
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: undefined,
        room_id: undefined,
        homeroom_teacher_id: undefined,
        name: "Kelas 7B",
        capacity: null,
      }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
  });
});

describe("deleteClassRecord (service)", () => {
  it("menghapus kelas dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ classes: () => table });

    const result = await deleteClassRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});

// ===== Schema: Copy Classes from Previous Year =====

describe("readCopyClassesInput (schema)", () => {
  it("menerima tahun ajaran tujuan yang valid", () => {
    const result = readCopyClassesInput(formData({ targetYearId: UUID }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.targetYearId).toBe(UUID);
    }
  });

  it("menolak tahun ajaran tujuan kosong", () => {
    expect(readCopyClassesInput(formData({})).ok).toBe(false);
  });

  it("menolak tahun ajaran tujuan bukan uuid", () => {
    expect(readCopyClassesInput(formData({ targetYearId: "bukan-uuid" })).ok).toBe(false);
  });
});

// ===== Service: Copy Classes from Previous Year =====

const UUID_2 = "22222222-2222-4222-8222-222222222222";
const GRADE_A = "aaaaaaa1-1111-4111-8111-111111111111";
const GRADE_B = "aaaaaaa2-2222-4222-8222-222222222222";

function makeCopySupabase(
  yearMocks: QueryMock[],
  classMocks: QueryMock[]
): SupabaseClient<Database> {
  let yearCall = 0;
  let classCall = 0;
  return {
    from: (table: string) => {
      if (table === "academic_years") {
        const mock = yearMocks[yearCall];
        yearCall += 1;
        if (!mock) throw new Error(`Panggilan academic_years ke-${yearCall} tidak di-mock`);
        return mock;
      }
      if (table === "classes") {
        const mock = classMocks[classCall];
        classCall += 1;
        if (!mock) throw new Error(`Panggilan classes ke-${classCall} tidak di-mock`);
        return mock;
      }
      throw new Error(`Tabel tak terduga: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

function targetYearMock(): QueryMock {
  const mock = new QueryMock();
  mock.data = { id: UUID, school_id: "school-1", start_date: "2025-07-01" };
  return mock;
}

describe("copyClassesFromPreviousYear (service)", () => {
  it("menolak jika tahun ajaran tujuan tidak ditemukan", async () => {
    const notFound = new QueryMock(null, { message: "row not found" });
    const supabase = makeCopySupabase([notFound], []);

    const result = await copyClassesFromPreviousYear({ supabase }, "school-1", UUID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Tahun ajaran tujuan tidak ditemukan.");
    }
  });

  it("menolak jika tidak ada tahun ajaran sebelumnya", async () => {
    const noSource = new QueryMock();
    noSource.data = null;
    const supabase = makeCopySupabase([targetYearMock(), noSource], []);

    const result = await copyClassesFromPreviousYear({ supabase }, "school-1", UUID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Tidak ada tahun ajaran sebelumnya");
    }
  });

  it("menolak jika tahun sumber tidak punya kelas", async () => {
    const noSource = new QueryMock();
    noSource.data = { id: UUID_2, name: "2024/2025", start_date: "2024-07-01" };
    const emptyClasses = new QueryMock();
    emptyClasses.data = [];
    const supabase = makeCopySupabase([targetYearMock(), noSource], [emptyClasses]);

    const result = await copyClassesFromPreviousYear({ supabase }, "school-1", UUID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Tidak ada kelas pada tahun ajaran "2024/2025"');
    }
  });

  it("menyalin kelas sumber dan melewati duplikat (nama + tingkat sama)", async () => {
    const noSource = new QueryMock();
    noSource.data = { id: UUID_2, name: "2024/2025", start_date: "2024-07-01" };
    const sourceClasses = new QueryMock();
    sourceClasses.data = [
      { grade_id: GRADE_A, major_id: null, room_id: null, homeroom_teacher_id: null, name: "7A", capacity: 30 },
      { grade_id: GRADE_B, major_id: null, room_id: null, homeroom_teacher_id: null, name: "7B", capacity: 32 },
      { grade_id: GRADE_A, major_id: null, room_id: null, homeroom_teacher_id: null, name: "8A", capacity: 28 },
    ];
    const targetClasses = new QueryMock();
    targetClasses.data = [{ name: "7a", grade_id: GRADE_A }];
    const insertTable = new QueryMock();
    const supabase = makeCopySupabase(
      [targetYearMock(), noSource],
      [sourceClasses, targetClasses, insertTable]
    );

    const result = await copyClassesFromPreviousYear({ supabase }, "school-1", UUID);

    expect(result).toEqual({ ok: true, created: 2, skipped: 1 });
    const insertCall = insertTable.calls.find((c) => c.startsWith("insert:"));
    expect(insertCall).toBeDefined();
    const payload = JSON.parse(insertCall!.slice("insert:".length));
    expect(payload).toHaveLength(2);
    for (const row of payload) {
      expect(row.academic_year_id).toBe(UUID);
      expect(row.school_id).toBe("school-1");
    }
    expect(payload.map((row: { name: string }) => row.name).sort()).toEqual(["7B", "8A"]);
  });

  it("mengembalikan created 0 tanpa error jika semua duplikat", async () => {
    const noSource = new QueryMock();
    noSource.data = { id: UUID_2, name: "2024/2025", start_date: "2024-07-01" };
    const sourceClasses = new QueryMock();
    sourceClasses.data = [
      { grade_id: GRADE_A, major_id: null, room_id: null, homeroom_teacher_id: null, name: "7A", capacity: 30 },
      { grade_id: GRADE_B, major_id: null, room_id: null, homeroom_teacher_id: null, name: "7B", capacity: 32 },
      { grade_id: GRADE_A, major_id: null, room_id: null, homeroom_teacher_id: null, name: "8A", capacity: 28 },
    ];
    const targetClasses = new QueryMock();
    targetClasses.data = [
      { name: "7a", grade_id: GRADE_A },
      { name: "7B", grade_id: GRADE_B },
      { name: " 8a ", grade_id: GRADE_A },
    ];
    const supabase = makeCopySupabase(
      [targetYearMock(), noSource],
      [sourceClasses, targetClasses]
    );

    const result = await copyClassesFromPreviousYear({ supabase }, "school-1", UUID);

    expect(result).toEqual({ ok: true, created: 0, skipped: 3 });
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeCopySupabase([], []);

    const result = await copyClassesFromPreviousYear({ supabase }, "", UUID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("admin sekolah");
    }
  });
});

// ===== Service: Student Enrollments =====

describe("saveEnrollmentRecord (service)", () => {
  it("mendaftarkan siswa dengan school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ student_enrollments: () => table });

    const result = await saveEnrollmentRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        exit_date: undefined,
        status: "active",
      }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.student_id).toBe(UUID);
    expect(payload.status).toBe("active");
  });

  it("memperbarui pendaftaran", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ student_enrollments: () => table });

    const result = await saveEnrollmentRecord(
      { supabase },
      makeUser(),
      {
        id: UUID,
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        exit_date: "2026-06-30",
        status: "lulus",
      }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
  });

  it("memberi pesan ramah saat duplikat (siswa sudah terdaftar di tahun ajaran ini)", async () => {
    const table = new QueryMock(null, { code: "23505", message: "duplicate key value" });
    const supabase = makeSupabase({ student_enrollments: () => table });

    const result = await saveEnrollmentRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        exit_date: undefined,
        status: "active",
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("sudah ada");
    }
  });
});

describe("deleteEnrollmentRecord (service)", () => {
  it("menghapus pendaftaran dengan filter school_id", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ student_enrollments: () => table });

    const result = await deleteEnrollmentRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });
});
