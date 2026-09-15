import { describe, it, expect } from "vitest";
import { can, canAny, moduleOf, actionOf } from "@/lib/rbac";

describe("can", () => {
  it("mengembalikan true jika isSuperAdmin", () => {
    expect(can([], "users.view", true)).toBe(true);
  });

  it("mengembalikan false jika permissions null", () => {
    expect(can(null, "users.view")).toBe(false);
  });

  it("mengembalikan false jika permissions undefined", () => {
    expect(can(undefined, "users.view")).toBe(false);
  });

  it("mengembalikan true jika slug ada dalam permissions", () => {
    expect(can(["users.view", "users.create"], "users.view")).toBe(true);
  });

  it("mengembalikan false jika slug tidak ada", () => {
    expect(can(["users.view"], "users.delete")).toBe(false);
  });
});

describe("canAny", () => {
  it("mengembalikan true jika isSuperAdmin", () => {
    expect(canAny([], ["users.view"], true)).toBe(true);
  });

  it("mengembalikan true jika salah satu slug cocok", () => {
    expect(canAny(["users.view"], ["users.view", "users.create"])).toBe(true);
  });

  it("mengembalikan false jika tidak ada yang cocok", () => {
    expect(canAny(["users.view"], ["roles.view", "roles.create"])).toBe(false);
  });
});

describe("moduleOf", () => {
  it("mengambil bagian sebelum titik", () => {
    expect(moduleOf("users.view")).toBe("users");
    expect(moduleOf("finance.bill_create")).toBe("finance");
  });
});

describe("actionOf", () => {
  it("mengambil bagian setelah titik", () => {
    expect(actionOf("users.view")).toBe("view");
    expect(actionOf("finance.bill_create")).toBe("bill_create");
  });
});
