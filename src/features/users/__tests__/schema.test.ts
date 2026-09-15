import { describe, expect, it } from "vitest";
import { findEscalatingSlugs } from "../service";
import { readSaveUserInput, saveUserSchema } from "../schema";

describe("findEscalatingSlugs", () => {
  it("mengembalikan slug yang tidak dimiliki actor", () => {
    const allowed = new Set(["users.view", "users.create"]);
    const result = findEscalatingSlugs(
      ["users.view", "roles.delete", null, "finance.view"],
      allowed
    );
    expect(result).toEqual(["roles.delete", "finance.view"]);
  });

  it("mengembalikan array kosong bila semua slug diizinkan", () => {
    const allowed = new Set(["users.view"]);
    expect(findEscalatingSlugs(["users.view", "users.view"], allowed)).toEqual(
      []
    );
  });

  it("mengabaikan slug null/undefined/kosong", () => {
    expect(findEscalatingSlugs([null, undefined, ""], new Set())).toEqual([]);
  });

  it("mengembalikan semua slug bila actor tidak punya izin apa pun", () => {
    expect(findEscalatingSlugs(["users.view"], new Set())).toEqual([
      "users.view",
    ]);
  });
});

function buildForm(fields: Record<string, string | string[]>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      value.forEach((item) => form.append(key, item));
    } else {
      form.append(key, value);
    }
  }
  return form;
}

describe("readSaveUserInput", () => {
  it("user baru wajib mengisi email dan password", () => {
    const result = readSaveUserInput(buildForm({ full_name: "Siti Aminah" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Email dan password wajib diisi");
    }
  });

  it("saat edit, email/password boleh kosong", () => {
    const result = readSaveUserInput(
      buildForm({
        id: "9a1b2c3d-0000-4000-8000-000000000001",
        full_name: "Siti Aminah",
        phone: "0812",
        jabatan: "Staf TU",
        is_active: "true",
        roles_included: "true",
        role_ids: ["r1", "r2"],
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.email).toBeUndefined();
      expect(result.command.is_active).toBe(true);
      expect(result.command.role_ids).toEqual(["r1", "r2"]);
      expect(result.command.roles_included).toBe(true);
      expect(result.command.phone).toBe("0812");
    }
  });

  it("menolak password lemah dengan pesan kebijakan password", () => {
    const result = readSaveUserInput(
      buildForm({
        full_name: "Siti Aminah",
        email: "siti@sekolah.sch.id",
        password: "pendek",
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Password");
    }
  });

  it("menolak nama terlalu pendek", () => {
    const result = saveUserSchema.safeParse({
      full_name: "A",
      email: "a@sekolah.sch.id",
      password: "rahasia1",
    });
    expect(result.success).toBe(false);
  });

  it("mapping flag super admin (school_included/school_id)", () => {
    const result = readSaveUserInput(
      buildForm({
        full_name: "Guru Baru",
        email: "guru@sekolah.sch.id",
        password: "rahasia123",
        school_included: "true",
        school_id: "school-123",
        is_active: "false",
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.school_included).toBe(true);
      expect(result.command.school_id).toBe("school-123");
      expect(result.command.is_active).toBe(false);
      expect(result.command.email).toBe("guru@sekolah.sch.id");
    }
  });
});
