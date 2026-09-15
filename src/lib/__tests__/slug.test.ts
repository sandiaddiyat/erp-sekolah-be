import { describe, it, expect } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("mengubah teks menjadi lowercase", () => {
    expect(slugify("Hello World")).toBe("hello_world");
  });

  it("menghapus karakter non-alfanumerik", () => {
    expect(slugify("Admin Sekolah!")).toBe("admin_sekolah");
  });

  it("menggunakan separator custom", () => {
    expect(slugify("Sekolah Dasar", "-")).toBe("sekolah-dasar");
  });

  it("menggunakan fallback jika hasil kosong", () => {
    expect(slugify("!!!")).toBe("item");
    expect(slugify("!!!", "_", "default")).toBe("default");
  });

  it("membatasi panjang maksimal 50 karakter", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(50);
  });

  it("menghapus separator di awal dan akhir", () => {
    expect(slugify(" hello ")).toBe("hello");
  });
});
