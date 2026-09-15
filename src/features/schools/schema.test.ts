import { describe, it, expect } from "vitest";
import { readSaveSchoolInput as parse } from "@/features/schools/schema";

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

describe("readSaveSchoolInput (schema)", () => {
  it("mem-parsing sekolah trial tanpa admin", () => {
    const result = parse(
      formData({ name: "SMP Test", status: "trial" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.name).toBe("SMP Test");
      expect(result.command.status).toBe("trial");
      expect(result.command.create_admin).toBe(false);
      expect(result.command.email).toBeNull();
      expect(result.command.active_until).toBeNull();
    }
  });

  it("gagal jika nama kurang dari 3 karakter", () => {
    const result = parse(formData({ name: "AB" }));
    expect(result.ok).toBe(false);
  });

  it("memvalidasi email sekolah tidak valid", () => {
    const result = parse(formData({ name: "SMP Test", email: "bukan-email" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("email");
    }
  });

  it("memvalidasi format tanggal active_until", () => {
    const result = parse(
      formData({ name: "SMP Test", active_until: "31-12-2024" })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("tanggal");
    }
  });

  it("memvalidasi password admin minimal 8 karakter", () => {
    const result = parse(
      formData({
        name: "SMP Test",
        create_admin: "true",
        admin_name: "Budi",
        admin_email: "budi@test.com",
        admin_password: "123",
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/password/i);
    }
  });

  it("gagal jika memilih admin tapi email admin kosong", () => {
    const result = parse(
      formData({
        name: "SMP Test",
        create_admin: "true",
        admin_name: "Budi",
        admin_email: "",
      })
    );
    expect(result.ok).toBe(false);
  });

  it("mem-parsing create_admin true dengan data lengkap", () => {
    const result = parse(
      formData({
        name: "SMP Test",
        status: "active",
        create_admin: "true",
        admin_name: "Budi Santoso",
        admin_email: "budi@test.com",
        admin_password: "Password123!",
      })
    );
    expect(result.ok).toBe(true);
  });
});
