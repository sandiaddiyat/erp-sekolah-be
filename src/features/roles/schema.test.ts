import { describe, it, expect } from "vitest";
import { findEscalatingSlugs } from "@/features/roles/service";
import { readSaveRoleInput as parse, saveRoleSchema } from "@/features/roles/schema";

function formData(obj: Record<string, unknown>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      for (const v of value) fd.append(key, String(v));
    } else if (value !== undefined) {
      fd.append(key, String(value));
    }
  }
  return fd;
}

describe("findEscalatingSlugs", () => {
  it("mengembalikan slug yang tidak ada di allowed", () => {
    const result = findEscalatingSlugs(["a", null, "b", undefined, "c"], new Set(["a"]));
    expect(result).toEqual(["b", "c"]);
  });

  it("mengembalikan array kosong jika semua diperbolehkan", () => {
    expect(findEscalatingSlugs(["a", "b"], new Set(["a", "b"]))).toEqual([]);
  });

  it("mengembalikan array kosong jika input kosong", () => {
    expect(findEscalatingSlugs([], new Set(["a"]))).toEqual([]);
  });
});

describe("readSaveRoleInput (schema)", () => {
  it("memparsing nama saja untuk role baru", () => {
    const result = parse(formData({ name: "Wali Kelas" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.name).toBe("Wali Kelas");
      expect(result.command.permission_ids).toEqual([]);
      expect(result.command.id).toBeUndefined();
    }
  });

  it("mem-parsing permission_ids yang dipilih", () => {
    const result = parse(
      formData({ name: "Admin", permission_ids: ["p1", "p2"] })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.permission_ids).toEqual(["p1", "p2"]);
    }
  });

  it("gagal jika nama kurang dari 2 karakter", () => {
    const result = parse(formData({ name: "A" }));
    expect(result.ok).toBe(false);
  });

  it("mem-parsing id untuk mode edit", () => {
    const result = parse(
      formData({ id: "123e4567-e89b-12d3-a456-426614174000", name: "Update" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.id).toBe("123e4567-e89b-12d3-a456-426614174000");
    }
  });
});

describe("saveRoleSchema", () => {
  it("menolak deskripsi undefined (opsional)", () => {
    const result = saveRoleSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(true);
  });
});
