import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  saveRoleRecord,
  deleteRoleRecord,
  type RoleMutationsDeps,
} from "@/features/roles/service";
import type { CurrentUser } from "@/lib/types";
import type { SaveRoleCommand } from "@/features/roles/schema";

type Row = { data?: unknown; error?: unknown; count?: number };

/**
 * Mock Supabase client yang fleksibel: tiap tabel mengembalikan { data, error }
 * yang sudah dikonfigurasi. Query builder bersifat chainable (select/eq/in/like
 * kembali dirinya sendiri) dan "then-able" agar bisa di-await. Sama sekali
 * tidak menyentuh database sungguhan.
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
  select() {
    return this;
  }
  eq() {
    return this;
  }
  in() {
    return this;
  }
  like() {
    return this;
  }
  maybeSingle() {
    return this;
  }
  single() {
    return this;
  }
  order() {
    return this;
  }
  insert() {
    return this;
  }
  update() {
    return this;
  }
  delete() {
    return this;
  }
  head() {
    return this;
  }
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

/**
 * Membuat Supabase client mock dengan konfigurasi per tabel.
 * `counts` mengatur nilai `count` yang dikembalikan query count.
 */
function makeSupabase(
  tableRows: Record<string, Row>,
  counts: Record<string, number> = {}
): SupabaseClient<Database> {
  return {
    from: (table: string) => {
      const row = tableRows[table] ?? { data: null, error: null };
      return new QueryMock(row.data, row.error, counts[table]);
    },
  } as unknown as SupabaseClient<Database>;
}

describe("saveRoleRecord (service)", () => {
  it("membuat role baru sukses (super admin)", async () => {
    const supabase = makeSupabase({
      roles: { data: [{ slug: "wali_kelas_2" }], error: null }, // existing slugs
    });
    // insert mengembalikan data [{ id: "role-1" }]
    const supabaseInsert = {
      from: (table: string) => {
        if (table === "roles") {
          // select().like() → existing slugs; insert().select().single() → new row
          return new QueryMock([{ slug: "wali_kelas_2" }, { slug: "wali_kelas_3" }], null);
        }
        return new QueryMock(null, null);
      },
    } as unknown as SupabaseClient<Database>;

    const deps: RoleMutationsDeps = { supabase: supabaseInsert };
    const user = makeUser({ isSuperAdmin: true, permissions: [] });

    const command: SaveRoleCommand = {
      name: "Wali Kelas",
      description: "Kelas wali",
      permission_ids: [],
    };

    const result = await saveRoleRecord(deps, user, command);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toBe("Role baru berhasil dibuat.");
    }
  });

  it("menolak privilege escalation (non-super-admin)", async () => {
    // Actor punya roles.update tapi diminta permission users.create yang tidak dimiliki.
    const supabase = makeSupabase({
      permissions: { data: [{ slug: "users.create" }], error: null },
    });

    const deps: RoleMutationsDeps = { supabase };
    const user = makeUser({
      isSuperAdmin: false,
      permissions: ["roles.update"],
    });

    const command: SaveRoleCommand = {
      name: "Wali Kelas",
      description: "",
      permission_ids: ["perm-1"],
    };

    const result = await saveRoleRecord(deps, user, command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tidak bisa memberikan hak akses");
    }
  });

  it("gagal update role yang tidak ditemukan", async () => {
    const supabase = makeSupabase({
      roles: { data: null, error: null },
    });

    const deps: RoleMutationsDeps = { supabase };
    const user = makeUser({ isSuperAdmin: true, permissions: [] });

    const command: SaveRoleCommand = {
      id: "nonexistent-id",
      name: "Update Role",
      description: "",
      permission_ids: [],
    };

    const result = await saveRoleRecord(deps, user, command);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tidak ditemukan");
    }
  });
});

describe("deleteRoleRecord (service)", () => {
  it("menolak hapus role sistem", async () => {
    const supabase = makeSupabase({
      roles: { data: { id: "role-1", name: "Admin", is_system: true }, error: null },
    });

    const deps: RoleMutationsDeps = { supabase };
    const user = makeUser({ isSuperAdmin: true, permissions: [] });

    const result = await deleteRoleRecord(deps, user, "role-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Role bawaan tidak bisa dihapus.");
    }
  });

  it("menolak hapus role yang masih dipakai user", async () => {
    const supabase = makeSupabase(
      {
        roles: { data: { id: "role-1", name: "Guru", is_system: false }, error: null },
      },
      { user_roles: 5 } // count query mengembalikan 5
    );

    const deps: RoleMutationsDeps = { supabase };
    const user = makeUser({ isSuperAdmin: true, permissions: [] });

    const result = await deleteRoleRecord(deps, user, "role-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("masih dipakai oleh 5 user");
    }
  });

  it("menolak non-super-admin tanpa permission delete", async () => {
    const supabase = makeSupabase({});
    const deps: RoleMutationsDeps = { supabase };
    const user = makeUser({ isSuperAdmin: false, permissions: [] });

    const result = await deleteRoleRecord(deps, user, "role-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Anda tidak punya izin menghapus role.");
    }
  });
});
