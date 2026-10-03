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
  countActiveStudentsInClass,
  copyClassesFromPreviousYear,
  saveEnrollmentRecord,
  deleteEnrollmentRecord,
  fetchAvailableStudentsForAcademicYear,
  saveBulkEnrollmentDiffRecord,
  fetchClassRoster,
  fetchClassRosterWithAvailable,
  savePlacementRecord,
  fetchUnplacedStudents,
  generateDraftPlacement,
  finalizePlacementRecord,
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
  readSavePlacementInput,
  readGenerateDraftPlacementInput,
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
  in(column: string, values: unknown[]) {
    this.calls.push(`in:${column}=${values.join(",")}`);
    return this;
  }
  not(column: string, operator: string, value: string) {
    this.calls.push(`not:${column}:${operator}:${value}`);
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

  it("status default aktif dan shift kosong menjadi null", () => {
    const result = readSaveClassInput(
      formData({ academic_year_id: UUID, grade_id: UUID, name: "Kelas 7A" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.status).toBe("aktif");
      expect(result.command.shift).toBeNull();
    }
  });

  it("menerima shift pagi/siang", () => {
    const result = readSaveClassInput(
      formData({
        academic_year_id: UUID,
        grade_id: UUID,
        name: "Kelas 7A",
        shift: "siang",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.shift).toBe("siang");
    }
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
    const gradeTable = new QueryMock({ education_level_id: UUID });
    const levelTable = new QueryMock({ code: "SMA" });
    const supabase = makeSupabase({
      classes: () => table,
      grades: () => gradeTable,
      education_levels: () => levelTable,
    });

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
        class_code: undefined,
        status: "aktif",
        shift: null,
      }
    );

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      table.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.name).toBe("Kelas 7A");
    expect(payload.capacity).toBe(32);
    expect(payload.status).toBe("aktif");
    expect(payload.created_by).toBe("user-1");
  });

  it("memperbarui kelas", async () => {
    const table = new QueryMock();
    const gradeTable = new QueryMock({ education_level_id: UUID });
    const levelTable = new QueryMock({ code: "SD" });
    const supabase = makeSupabase({
      classes: () => table,
      grades: () => gradeTable,
      education_levels: () => levelTable,
    });

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
        class_code: undefined,
        status: "aktif",
        shift: null,
      }
    );

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:id=" + UUID)).toBe(true);
  });

  it("menolak jurusan kosong untuk jenjang SMA", async () => {
    const gradeTable = new QueryMock({ education_level_id: UUID });
    const levelTable = new QueryMock({ code: "SMA" });
    const supabase = makeSupabase({
      grades: () => gradeTable,
      education_levels: () => levelTable,
    });

    const result = await saveClassRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: undefined,
        room_id: undefined,
        homeroom_teacher_id: undefined,
        name: "Kelas 10A",
        capacity: null,
        class_code: undefined,
        status: "aktif",
        shift: null,
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Jurusan wajib diisi untuk jenjang SMA/SMK.");
    }
  });

  it("menolak jurusan diisi untuk jenjang non-SMA/SMK", async () => {
    const gradeTable = new QueryMock({ education_level_id: UUID });
    const levelTable = new QueryMock({ code: "SD" });
    const supabase = makeSupabase({
      grades: () => gradeTable,
      education_levels: () => levelTable,
    });

    const result = await saveClassRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: UUID,
        room_id: undefined,
        homeroom_teacher_id: undefined,
        name: "Kelas 3A",
        capacity: null,
        class_code: undefined,
        status: "aktif",
        shift: null,
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Jurusan hanya boleh diisi untuk jenjang SMA/SMK."
      );
    }
  });

  it("menolak nama kelas duplikat di tingkat & tahun ajaran sama", async () => {
    const table = new QueryMock({ id: UUID });
    const gradeTable = new QueryMock({ education_level_id: UUID });
    const levelTable = new QueryMock({ code: "SD" });
    const supabase = makeSupabase({
      classes: () => table,
      grades: () => gradeTable,
      education_levels: () => levelTable,
    });

    const result = await saveClassRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: undefined,
        room_id: undefined,
        homeroom_teacher_id: undefined,
        name: "Kelas 7A",
        capacity: null,
        class_code: undefined,
        status: "aktif",
        shift: null,
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        "Nama kelas sudah digunakan di tingkat dan tahun ajaran yang sama."
      );
    }
  });

  it("menolak kode kelas yang sudah dipakai", async () => {
    const table = new QueryMock();
    const codeTable = new QueryMock({ id: UUID });
    const gradeTable = new QueryMock({ education_level_id: UUID });
    const levelTable = new QueryMock({ code: "SD" });
    let classesCall = 0;
    const supabase = {
      from: (name: string) => {
        if (name === "classes") {
          classesCall += 1;
          // panggilan pertama: cek duplikat nama (kosong),
          // panggilan kedua: cek kode kelas (sudah ada)
          return classesCall === 1 ? table : codeTable;
        }
        if (name === "grades") return gradeTable;
        if (name === "education_levels") return levelTable;
        throw new Error(`Tabel tak terduga: ${name}`);
      },
    } as unknown as SupabaseClient<Database>;

    const result = await saveClassRecord(
      { supabase },
      makeUser(),
      {
        id: undefined,
        academic_year_id: UUID,
        grade_id: UUID,
        major_id: undefined,
        room_id: undefined,
        homeroom_teacher_id: undefined,
        name: "Kelas 7A",
        capacity: null,
        class_code: "7A-2026",
        status: "aktif",
        shift: null,
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Kode kelas sudah dipakai kelas lain.");
    }
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

describe("countActiveStudentsInClass (service)", () => {
  it("mengembalikan jumlah siswa aktif di kelas", async () => {
    const table = new QueryMock([
      { student_id: "student-1" },
      { student_id: "student-2" },
      { student_id: "student-3" },
    ]);
    const supabase = makeSupabase({ student_enrollments: () => table });

    const result = await countActiveStudentsInClass(
      { supabase },
      "school-1",
      UUID
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.count).toBe(3);
    }
    expect(table.calls).toContain("eq:class_id=" + UUID);
    expect(table.calls).toContain("eq:status=active");
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
    const classTable = new QueryMock(null);
    const supabase = makeSupabase({
      student_enrollments: () => table,
      classes: () => classTable,
    });

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

  it("menolak pendaftaran saat kapasitas kelas penuh", async () => {
    const classTable = new QueryMock({ capacity: 1 });
    const enrolledTable = new QueryMock([{ student_id: "student-1" }]);
    const supabase = {
      from: (name: string) => {
        if (name === "classes") return classTable;
        if (name === "student_enrollments") return enrolledTable;
        throw new Error(`Tabel tak terduga: ${name}`);
      },
    } as unknown as SupabaseClient<Database>;

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
      expect(result.error).toBe("Kapasitas kelas sudah penuh (1/1 siswa).");
    }
  });

  it("memperbarui pendaftaran", async () => {
    const table = new QueryMock();
    const currentRow = new QueryMock({ class_id: UUID });
    const classTable = new QueryMock(null);
    let enrollmentCall = 0;
    const supabase = {
      from: (name: string) => {
        if (name === "student_enrollments") {
          enrollmentCall += 1;
          // panggilan pertama: baca kelas saat ini, kedua: update
          return enrollmentCall === 1 ? currentRow : table;
        }
        if (name === "classes") return classTable;
        throw new Error(`Tabel tak terduga: ${name}`);
      },
    } as unknown as SupabaseClient<Database>;

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
    const classTable = new QueryMock(null);
    const supabase = makeSupabase({
      student_enrollments: () => table,
      classes: () => classTable,
    });

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

describe("saveBulkEnrollmentDiffRecord (service)", () => {
  const BULK_INPUT = {
    academic_year_id: UUID,
    class_id: UUID_2,
    enrollment_date: "2025-07-01",
    exit_date: undefined,
    status: "active" as const,
  };

  it("hapus siswa yang tidak dicentang dan menambah siswa baru", async () => {
    const existing = new QueryMock([
      { id: "enr-1", student_id: "student-1" },
      { id: "enr-2", student_id: "student-2" },
    ]);
    const classCapacity = new QueryMock(null);
    const deleted = new QueryMock();
    const inserted = new QueryMock();
    const queues = {
      student_enrollments: [existing, deleted, inserted],
      classes: [classCapacity],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await saveBulkEnrollmentDiffRecord(
      { supabase },
      makeUser(),
      { ...BULK_INPUT, siswa_ids: ["student-2", "student-3"] }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe("1 siswa ditambahkan, 1 siswa dikeluarkan dari kelas.");
    }
    expect(existing.calls).toContain("eq:school_id=school-1");
    expect(deleted.calls).toContain("in:id=enr-1");
    const payload = JSON.parse(inserted.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length));
    expect(payload).toHaveLength(1);
    expect(payload[0]).toMatchObject({ student_id: "student-3", class_id: UUID_2, school_id: "school-1" });
  });

  it("menolak penambahan siswa melebihi kapasitas kelas", async () => {
    const existing = new QueryMock([
      { id: "enr-1", student_id: "student-1", status: "active" },
    ]);
    const classCapacity = new QueryMock({ capacity: 1 });
    const supabase = makeSupabase({
      student_enrollments: () => existing,
      classes: () => classCapacity,
    });

    const result = await saveBulkEnrollmentDiffRecord(
      { supabase },
      makeUser(),
      { ...BULK_INPUT, siswa_ids: ["student-1", "student-2"] }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Kapasitas kelas sudah penuh (2/1 siswa).");
    }
  });

  it("tidak melakukan query tulis jika tidak ada perubahan", async () => {
    const existing = new QueryMock([{ id: "enr-1", student_id: "student-1" }]);
    const classCapacity = new QueryMock(null);
    const supabase = makeSupabase({
      student_enrollments: () => existing,
      classes: () => classCapacity,
    });

    const result = await saveBulkEnrollmentDiffRecord(
      { supabase },
      makeUser(),
      { ...BULK_INPUT, siswa_ids: ["student-1"] }
    );

    expect(result.ok).toBe(true);
    expect(existing.calls.some((c) => c.startsWith("insert:") || c === "delete")).toBe(false);
  });
});

describe("fetchClassRoster (service)", () => {
  it("mengembalikan anggota kelas dengan tahun ajaran dan nama kelas", async () => {
    const classRow = new QueryMock({
      name: "8A",
      academic_years: { name: "2025/2026" },
    });
    const members = new QueryMock([{ student_id: "student-1" }]);
    const students = new QueryMock([
      { id: "student-1", nama_lengkap: "Siswa Satu", nis: "001", jenis_kelamin: "P" },
    ]);
    const queues = { classes: [classRow], student_enrollments: [members], students: [students] };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchClassRoster({ supabase }, "school-1", UUID, UUID_2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          id: "student-1",
          nama_lengkap: "Siswa Satu",
          nis: "001",
          jenis_kelamin: "P",
          latest_prior_academic_year: "2025/2026",
          latest_prior_class: "8A",
        },
      ]);
    }
    expect(classRow.calls).toContain("eq:school_id=school-1");
  });

  it("mengembalikan daftar kosong bila kelas tidak punya anggota", async () => {
    const classRow = new QueryMock({ name: "8A", academic_years: { name: "2025/2026" } });
    const members = new QueryMock([]);
    const queues = { classes: [classRow], student_enrollments: [members] };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchClassRoster({ supabase }, "school-1", UUID, UUID_2);

    expect(result).toEqual({ ok: true, data: [] });
  });
});

describe("fetchClassRosterWithAvailable (service)", () => {
  it("menggabungkan siswa terdaftar dan bebas dengan flag registered", async () => {
    const classRow = new QueryMock({
      name: "8A",
      academic_years: { name: "2025/2026" },
    });
    const members = new QueryMock([{ student_id: "student-1" }]);
    const rosterStudents = new QueryMock([
      { id: "student-1", nama_lengkap: "Siswa Satu", nis: "001", jenis_kelamin: "P" },
    ]);
    const selectedYear = new QueryMock({ id: UUID, start_date: "2025-07-01" });
    const priorYears = new QueryMock([{ id: UUID_2 }]);
    const history = new QueryMock([]);
    const currentEnrollments = new QueryMock([{ student_id: "student-1" }]);
    const freeStudents = new QueryMock([
      { id: "student-2", nama_lengkap: "Siswa Dua", nis: null, jenis_kelamin: null },
    ]);

    const queues = {
      classes: [classRow],
      student_enrollments: [members, history, currentEnrollments],
      students: [rosterStudents, freeStudents],
      academic_years: [selectedYear, priorYears],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchClassRosterWithAvailable({ supabase }, "school-1", UUID, UUID_2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "student-1", registered: true, latest_prior_class: "8A" }),
          expect.objectContaining({ id: "student-2", registered: false }),
        ])
      );
      // sorted by nama_lengkap: "Siswa Dua" < "Siswa Satu"
      expect(result.data[0].id).toBe("student-2");
      expect(result.data[1].id).toBe("student-1");
    }
  });

  it("mengembalikan hanya yang terdaftar bila tidak ada siswa bebas", async () => {
    const classRow = new QueryMock({
      name: "8A",
      academic_years: { name: "2025/2026" },
    });
    const members = new QueryMock([{ student_id: "student-1" }]);
    const rosterStudents = new QueryMock([
      { id: "student-1", nama_lengkap: "Siswa Satu", nis: "001", jenis_kelamin: "P" },
    ]);
    const selectedYear = new QueryMock({ id: UUID, start_date: "2025-07-01" });
    const priorYears = new QueryMock([{ id: UUID_2 }]);
    const history = new QueryMock([]);
    const currentEnrollments = new QueryMock([{ student_id: "student-1" }]);
    const freeStudents = new QueryMock([]);

    const queues = {
      classes: [classRow],
      student_enrollments: [members, history, currentEnrollments],
      students: [rosterStudents, freeStudents],
      academic_years: [selectedYear, priorYears],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchClassRosterWithAvailable({ supabase }, "school-1", UUID, UUID_2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          id: "student-1",
          nama_lengkap: "Siswa Satu",
          nis: "001",
          jenis_kelamin: "P",
          latest_prior_academic_year: "2025/2026",
          latest_prior_class: "8A",
          registered: true,
        },
      ]);
    }
  });

  it("mengembalikan hanya yang bebas bila kelas kosong", async () => {
    const classRow = new QueryMock({
      name: "9B",
      academic_years: { name: "2025/2026" },
    });
    // fetchClassRoster: members empty → returns [] early (no students query from roster)
    const members = new QueryMock([]);
    const selectedYear = new QueryMock({ id: UUID, start_date: "2025-07-01" });
    // No prior years → history query skipped
    const priorYears = new QueryMock([]);
    const currentEnrollments = new QueryMock([]);
    const freeStudents = new QueryMock([
      { id: "student-2", nama_lengkap: "Siswa Bebas", nis: null, jenis_kelamin: null },
    ]);

    const queues = {
      classes: [classRow],
      student_enrollments: [members, currentEnrollments],
      students: [freeStudents],
      academic_years: [selectedYear, priorYears],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchClassRosterWithAvailable({ supabase }, "school-1", UUID, UUID_2);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          id: "student-2",
          nama_lengkap: "Siswa Bebas",
          nis: null,
          jenis_kelamin: null,
          latest_prior_academic_year: null,
          latest_prior_class: null,
          registered: false,
        },
      ]);
    }
  });
});

describe("fetchAvailableStudentsForAcademicYear (service)", () => {
  it("menggabungkan riwayat terbaru hanya dari tahun sebelumnya dan mengecualikan siswa yang sudah terdaftar", async () => {
    const selectedYear = new QueryMock({ id: UUID, start_date: "2025-07-01" });
    const priorYears = new QueryMock([{ id: UUID_2 }, { id: "33333333-3333-4333-8333-333333333333" }]);
    const history = new QueryMock([
      {
        student_id: "student-1",
        enrollment_date: "2024-07-01",
        created_at: "2024-07-01T00:00:00Z",
        academic_years: { name: "2024/2025", start_date: "2024-07-01" },
        classes: { name: "8A" },
      },
      {
        student_id: "student-1",
        enrollment_date: "2023-07-01",
        created_at: "2023-07-01T00:00:00Z",
        academic_years: { name: "2023/2024", start_date: "2023-07-01" },
        classes: { name: "7A" },
      },
    ]);
    const currentEnrollments = new QueryMock([{ student_id: "already-enrolled" }]);
    const students = new QueryMock([
      { id: "student-1", nama_lengkap: "Siswa Lama", nis: "001", jenis_kelamin: "L" },
      { id: "student-2", nama_lengkap: "Siswa Baru", nis: null, jenis_kelamin: null },
    ]);
    const queues = {
      academic_years: [selectedYear, priorYears],
      student_enrollments: [history, currentEnrollments],
      students: [students],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchAvailableStudentsForAcademicYear({ supabase }, "school-1", UUID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          id: "student-1",
          nama_lengkap: "Siswa Lama",
          nis: "001",
          jenis_kelamin: "L",
          latest_prior_academic_year: "2024/2025",
          latest_prior_class: "8A",
        },
        {
          id: "student-2",
          nama_lengkap: "Siswa Baru",
          nis: null,
          jenis_kelamin: null,
          latest_prior_academic_year: null,
          latest_prior_class: null,
        },
      ]);
    }
    expect(selectedYear.calls).toContain("eq:school_id=school-1");
    expect(history.calls).toContain(`in:academic_year_id=${UUID_2},33333333-3333-4333-8333-333333333333`);
    expect(history.calls.some((call) => call.includes("student_enrollments_class_tenant_fkey"))).toBe(true);
    expect(students.calls).toContain("not:id:in:(already-enrolled)");
  });

  it("menolak tahun ajaran yang tidak ditemukan untuk sekolah", async () => {
    const selectedYear = new QueryMock(null, { message: "not found" });
    const supabase = makeSupabase({ academic_years: () => selectedYear });

    const result = await fetchAvailableStudentsForAcademicYear({ supabase }, "school-1", UUID);

    expect(result).toEqual({ ok: false, error: "Tahun ajaran tidak ditemukan." });
    expect(selectedYear.calls).toContain("eq:school_id=school-1");
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

// ===== Class Placement (Issue #104) =====

describe("readSavePlacementInput (schema)", () => {
  it("menerima penempatan lengkap dan default placement_status final", () => {
    const result = readSavePlacementInput(
      formData({
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.placement_status).toBe("final");
      expect(result.command.status).toBe("active");
    }
  });

  it("menerima placement_status draft", () => {
    const result = readSavePlacementInput(
      formData({
        student_id: UUID,
        academic_year_id: UUID,
        class_id: UUID,
        enrollment_date: "2025-07-01",
        placement_status: "draft",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.placement_status).toBe("draft");
    }
  });

  it("menolak placement_status tidak valid", () => {
    expect(
      readSavePlacementInput(
        formData({
          student_id: UUID,
          academic_year_id: UUID,
          class_id: UUID,
          enrollment_date: "2025-07-01",
          placement_status: "entah",
        })
      ).ok
    ).toBe(false);
  });

  it("menolak tanpa class_id", () => {
    expect(
      readSavePlacementInput(
        formData({
          student_id: UUID,
          academic_year_id: UUID,
          enrollment_date: "2025-07-01",
        })
      ).ok
    ).toBe(false);
  });
});

describe("readGenerateDraftPlacementInput (schema)", () => {
  it("menerima tahun ajaran dan tingkat valid", () => {
    const result = readGenerateDraftPlacementInput(
      formData({ academic_year_id: UUID, grade_id: UUID })
    );
    expect(result.ok).toBe(true);
  });

  it("menolak tanpa tingkat", () => {
    expect(readGenerateDraftPlacementInput(formData({ academic_year_id: UUID })).ok).toBe(false);
  });
});

describe("savePlacementRecord (service)", () => {
  const PAYLOAD = {
    id: undefined,
    student_id: UUID,
    academic_year_id: UUID,
    class_id: UUID,
    enrollment_date: "2025-07-01",
    exit_date: undefined,
    status: "active" as const,
    placement_status: "final" as const,
  };

  it("menempatkan siswa dengan school_id dari user login", async () => {
    const enrollments = new QueryMock();
    const queues = {
      classes: [
        new QueryMock({ grade_id: UUID, major_id: null }),
        new QueryMock({
          id: UUID,
          name: "7A",
          major_id: null,
          capacity: null,
          academic_year_id: UUID,
          grade_id: UUID,
        }),
      ],
      student_enrollments: [enrollments],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await savePlacementRecord({ supabase }, makeUser(), PAYLOAD);

    expect(result.ok).toBe(true);
    const payload = JSON.parse(
      enrollments.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(payload.school_id).toBe("school-1");
    expect(payload.student_id).toBe(UUID);
    expect(payload.placement_status).toBe("final");
  });

  it("menolak saat kapasitas kelas sudah penuh", async () => {
    const queues = {
      classes: [
        new QueryMock({ grade_id: UUID, major_id: null }),
        new QueryMock({
          id: UUID,
          name: "7A",
          major_id: null,
          capacity: 1,
          academic_year_id: UUID,
          grade_id: UUID,
        }),
      ],
      student_enrollments: [new QueryMock([{ id: "enr-1" }])],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await savePlacementRecord({ supabase }, makeUser(), PAYLOAD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Kapasitas kelas sudah penuh (1/1 siswa).");
    }
  });

  it("menolak saat kelas tidak sesuai tahun ajaran", async () => {
    const queues = {
      classes: [
        new QueryMock({ grade_id: UUID, major_id: null }),
        new QueryMock({
          id: UUID,
          name: "7A",
          major_id: null,
          capacity: null,
          academic_year_id: UUID_2,
          grade_id: UUID,
        }),
      ],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await savePlacementRecord({ supabase }, makeUser(), PAYLOAD);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Kelas tujuan tidak sesuai dengan tahun ajaran yang dipilih.");
    }
  });
});

describe("fetchUnplacedStudents (service)", () => {
  it("menge-return siswa aktif yang belum terdaftar di tahun ajaran", async () => {
    const queues = {
      student_enrollments: [new QueryMock([{ student_id: "student-1" }])],
      students: [
        new QueryMock([
          { id: "student-1", nama_lengkap: "A", nis: "001", jenis_kelamin: "L" },
          { id: "student-2", nama_lengkap: "B", nis: null, jenis_kelamin: "P" },
        ]),
      ],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await fetchUnplacedStudents({ supabase }, "school-1", UUID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("student-2");
    }
  });
});

describe("generateDraftPlacement (service)", () => {
  it("menolak saat tidak ada kelas pada tingkat", async () => {
    const queues = { classes: [new QueryMock([])] };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await generateDraftPlacement({ supabase }, makeUser(), UUID, UUID);

    expect(result).toEqual({
      ok: false,
      error: "Tidak ada kelas yang dibuka pada tingkat ini.",
    });
  });

  it("menolak saat semua siswa sudah ditempatkan", async () => {
    const queues = {
      classes: [new QueryMock([{ id: UUID, capacity: 30 }])],
      academic_years: [
        new QueryMock({ start_date: "2025-07-01", end_date: "2026-06-30" }),
      ],
      // 1) fetchUnplacedStudents -> baca enrollment, 2) baca students
      student_enrollments: [new QueryMock([{ student_id: "student-1" }])],
      students: [new QueryMock([{ id: "student-1", nama_lengkap: "A" }])],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await generateDraftPlacement({ supabase }, makeUser(), UUID, UUID);

    expect(result).toEqual({
      ok: false,
      error: "Tidak ada siswa yang belum ditempatkan.",
    });
  });

  it("membagi siswa secara round-robin ke kelas yang tersedia", async () => {
    const inserted = new QueryMock();
    const queues = {
      classes: [
        new QueryMock([
          { id: "class-a", capacity: 2 },
          { id: "class-b", capacity: 2 },
        ]),
      ],
      academic_years: [
        new QueryMock({ start_date: "2025-07-01", end_date: "2026-06-30" }),
      ],
      // 1) fetchUnplaced -> enrollment, 2) students, 3) hitung okupansi, 4) insert
      student_enrollments: [new QueryMock([]), new QueryMock([]), inserted],
      students: [
        new QueryMock([
          { id: "s1", nama_lengkap: "A", nis: null, jenis_kelamin: null },
          { id: "s2", nama_lengkap: "B", nis: null, jenis_kelamin: null },
        ]),
      ],
    };
    const supabase = {
      from: (table: keyof typeof queues) => queues[table].shift(),
    } as unknown as SupabaseClient<Database>;

    const result = await generateDraftPlacement({ supabase }, makeUser(), UUID, UUID);

    expect(result).toEqual({ ok: true, created: 2, unplaced: 0 });
    const rows = JSON.parse(
      inserted.calls.find((c) => c.startsWith("insert:"))!.slice("insert:".length)
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].class_id).toBe("class-a");
    expect(rows[1].class_id).toBe("class-b");
    expect(rows[0].placement_status).toBe("draft");
  });
});

describe("finalizePlacementRecord (service)", () => {
  it("mengubah draft menjadi final untuk tahun ajaran terpilih", async () => {
    const table = new QueryMock();
    const supabase = makeSupabase({ student_enrollments: () => table });

    const result = await finalizePlacementRecord({ supabase }, makeUser(), UUID);

    expect(result.ok).toBe(true);
    expect(table.calls.some((c) => c === "eq:placement_status=draft")).toBe(true);
    expect(table.calls.some((c) => c === "eq:school_id=school-1")).toBe(true);
  });

  it("menolak user tanpa school_id", async () => {
    const supabase = makeSupabase({});
    const user = makeUser({ profile: { school_id: null } as never });

    const result = await finalizePlacementRecord({ supabase }, user, UUID);

    expect(result.ok).toBe(false);
  });
});
