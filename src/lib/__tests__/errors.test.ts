import { describe, it, expect, vi } from "vitest";
import { serverError } from "@/lib/errors";

describe("serverError", () => {
  it("mengembalikan fallback message", () => {
    expect(serverError(new Error("db error"), "Gagal menyimpan.")).toBe("Gagal menyimpan.");
  });

  it("log error ke console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("internal error");
    serverError(err, "Fallback");
    expect(spy).toHaveBeenCalledWith("[server-error]", err);
    spy.mockRestore();
  });

  it("tidak log jika error falsy", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    serverError(null, "Fallback");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
