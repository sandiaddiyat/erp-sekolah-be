import { describe, it, expect } from "vitest";
import { validatePassword, MIN_PASSWORD_LENGTH } from "@/lib/password";

describe("validatePassword", () => {
  it("menolak password kurang dari 8 karakter", () => {
    expect(validatePassword("abc123")).not.toBeNull();
    expect(validatePassword("ab1")).not.toBeNull();
  });

  it("menolak password tanpa huruf", () => {
    expect(validatePassword("12345678")).not.toBeNull();
  });

  it("menolak password tanpa angka", () => {
    expect(validatePassword("abcdefgh")).not.toBeNull();
  });

  it("menerima password valid", () => {
    expect(validatePassword("password1")).toBeNull();
    expect(validatePassword("Abcdef12")).toBeNull();
  });

  it("MIN_PASSWORD_LENGTH adalah 8", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });
});
