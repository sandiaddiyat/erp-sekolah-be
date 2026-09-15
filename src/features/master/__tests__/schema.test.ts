import { describe, expect, it } from "vitest";
import { readSaveMasterInput } from "../schema";
import { isMasterEntity } from "../service";

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.append(key, value);
  }
  return fd;
}

describe("readSaveMasterInput", () => {
  it("menerima nama status valid", () => {
    const result = readSaveMasterInput(
      "status_kepegawaian",
      formData({ nama_status: "PNS" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toEqual({ nama_status: "PNS" });
    }
  });

  it("menolak nama terlalu pendek", () => {
    const result = readSaveMasterInput(
      "status_kepegawaian",
      formData({ nama_status: "P" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak entity yang tidak dikenal", () => {
    expect(isMasterEntity("hacked_table")).toBe(false);
    expect(isMasterEntity("jabatan")).toBe(true);
  });

  it("mengubah kuota hari menjadi angka atau null", () => {
    const withQuota = readSaveMasterInput(
      "jenis_cuti_izin",
      formData({ nama_jenis: "Cuti Tahunan", kuota_hari: "12" })
    );
    expect(withQuota.ok).toBe(true);
    if (withQuota.ok) {
      expect(withQuota.payload.kuota_hari).toBe(12);
    }

    const withoutQuota = readSaveMasterInput(
      "jenis_cuti_izin",
      formData({ nama_jenis: "Izin", kuota_hari: "" })
    );
    expect(withoutQuota.ok).toBe(true);
    if (withoutQuota.ok) {
      expect(withoutQuota.payload.kuota_hari).toBeNull();
    }
  });

  it("menolak kuota hari non-angka", () => {
    const result = readSaveMasterInput(
      "jenis_cuti_izin",
      formData({ nama_jenis: "Izin", kuota_hari: "banyak" })
    );
    expect(result.ok).toBe(false);
  });

  it("menolak tahun ajaran dengan format salah", () => {
    const result = readSaveMasterInput(
      "tahun_ajaran",
      formData({
        nama_tahun_ajaran: "2025-2026",
        semester: "ganjil",
        status_aktif: "on",
      })
    );
    expect(result.ok).toBe(false);
  });

  it("menerima tahun ajaran lengkap", () => {
    const result = readSaveMasterInput(
      "tahun_ajaran",
      formData({
        nama_tahun_ajaran: "2025/2026",
        semester: "genap",
        tanggal_mulai: "2026-01-01",
        tanggal_selesai: "2026-06-30",
        status_aktif: "true",
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.status_aktif).toBe(true);
      expect(result.payload.tanggal_mulai).toBe("2026-01-01");
    }
  });

  it("menolak tanggal selesai sebelum tanggal mulai", () => {
    const result = readSaveMasterInput(
      "tahun_ajaran",
      formData({
        nama_tahun_ajaran: "2025/2026",
        semester: "ganjil",
        tanggal_mulai: "2025-07-01",
        tanggal_selesai: "2025-01-01",
      })
    );
    expect(result.ok).toBe(false);
  });

  it("mengosongkan parent unit bila kosong", () => {
    const result = readSaveMasterInput(
      "unit_kerja",
      formData({ nama_unit: "SMK Nusantara", parent_unit_id: "" })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.parent_unit_id).toBeNull();
    }
  });
});
