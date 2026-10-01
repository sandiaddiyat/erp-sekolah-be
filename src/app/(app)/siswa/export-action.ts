"use server";

import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ExportSiswaResult = {
  filename?: string;
  data?: string;
  error?: string;
};

export type ExportSiswaFilter = {
  query?: string;
  gender?: string;
  agama?: string;
  status?: string;
  lahirDari?: string;
  lahirSampai?: string;
};

type ExportRow = Record<string, string | number>;

/**
 * Unduh data siswa dalam file Excel (.xlsx).
 * Jika filter diisi, hanya siswa yang cocok dengan filter yang diunduh.
 * Wajib permission `students.export`.
 */
export async function exportSiswa(
  filter: ExportSiswaFilter = {}
): Promise<ExportSiswaResult> {
  const guard = await guardAction({
    permission: PERMISSIONS.studentsExport,
    deniedMessage: "Anda tidak punya izin mengunduh data siswa.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();

  const [siswaResult, agamaResult] = await Promise.all([
    supabase.from("students").select("*").order("nama_lengkap"),
    supabase.from("agama").select("id, nama_agama"),
  ]);

  const loadError = siswaResult.error ?? agamaResult.error;
  if (loadError) return { error: "Gagal memuat data siswa." };

  const agamaName = new Map(
    (agamaResult.data ?? []).map((item) => [item.id, item.nama_agama])
  );

  let siswaList = siswaResult.data ?? [];

  const needle = (filter.query ?? "").trim().toLowerCase();
  if (needle) {
    siswaList = siswaList.filter((item) =>
      [
        item.nama_lengkap ?? "",
        item.nis ?? "",
        item.nisn ?? "",
        item.nama_ayah ?? "",
        item.nama_ibu ?? "",
        item.no_telp_wali ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }

  if (filter.gender) {
    siswaList = siswaList.filter((item) => item.jenis_kelamin === filter.gender);
  }
  if (filter.agama) {
    siswaList = siswaList.filter((item) => (item.agama_id ?? "") === filter.agama);
  }
  if (filter.status) {
    siswaList = siswaList.filter((item) => item.status === filter.status);
  }
  if (filter.lahirDari) {
    siswaList = siswaList.filter((item) => {
      const lahir = (item.tanggal_lahir ?? "").slice(0, 10);
      return !!lahir && lahir >= filter.lahirDari!;
    });
  }
  if (filter.lahirSampai) {
    siswaList = siswaList.filter((item) => {
      const lahir = (item.tanggal_lahir ?? "").slice(0, 10);
      return !!lahir && lahir <= filter.lahirSampai!;
    });
  }

  const XLSX = await import("xlsx");

  const header1 = [
    "No", "NIS", "NISN", "Nama Siswa", "Nama Panggilan", "Tempat", "Tanggal Lahir", "L/P",
    "Agama", "Status dalam Keluarga", "Anak ke",
    "Alamat", "", "", "", "", "",
    "Nama Orang Tua:", "",
    "Alamat Orang Tua", "", "", "", "", "",
    "Nomor Telepon Rumah",
    "Pekerjaan Orang Tua :", "",
    "Nama Wali Siswa",
    "Alamat Wali Siswa", "", "", "",
    "Nomor Telepon Wali Siswa",
    "Pekerjaan Wali Siswa",
    "Status"
  ];

  const header2 = [
    "", "", "", "", "", "", "", "", "", "", "",
    "Dusun", "RT", "RW", "Desa", "Kecamatan", "Kab./Kota",
    "Ayah", "Ibu",
    "Dusun", "RT", "RW", "Desa", "Kecamatan", "Kab./Kota",
    "",
    "Ayah", "Ibu",
    "",
    "Dusun", "RT", "RW", "Desa",
    "", "",
    ""
  ];

  const dataRows = siswaList.map((item, index) => [
    index + 1,
    item.nis ?? "",
    item.nisn ?? "",
    item.nama_lengkap ?? "",
    item.nama_panggilan ?? "",
    item.tempat_lahir ?? "",
    item.tanggal_lahir ?? "",
    item.jenis_kelamin ?? "",
    agamaName.get(item.agama_id ?? "") ?? "",
    item.status_dalam_keluarga ?? "",
    item.anak_ke ?? "",
    item.alamat_dusun ?? "",
    item.alamat_rt ?? "",
    item.alamat_rw ?? "",
    item.alamat_desa ?? "",
    item.alamat_kecamatan ?? "",
    item.alamat_kabupaten_kota ?? "",
    item.nama_ayah ?? "",
    item.nama_ibu ?? "",
    item.alamat_ortu_dusun ?? "",
    item.alamat_ortu_rt ?? "",
    item.alamat_ortu_rw ?? "",
    item.alamat_ortu_desa ?? "",
    item.alamat_ortu_kecamatan ?? "",
    item.alamat_ortu_kabupaten_kota ?? "",
    item.no_telp_rumah ?? "",
    item.pekerjaan_ayah ?? "",
    item.pekerjaan_ibu ?? "",
    item.nama_wali ?? "",
    item.alamat_wali_dusun ?? "",
    item.alamat_wali_rt ?? "",
    item.alamat_wali_rw ?? "",
    item.alamat_wali_desa ?? "",
    item.no_telp_wali ?? "",
    item.pekerjaan_wali ?? "",
    item.status ?? ""
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([header1, header2, ...dataRows]);
  
  worksheet["!merges"] = [
    { s: { r: 0, c: 11 }, e: { r: 0, c: 16 } }, // Alamat
    { s: { r: 0, c: 17 }, e: { r: 0, c: 18 } }, // Nama Orang Tua
    { s: { r: 0, c: 19 }, e: { r: 0, c: 24 } }, // Alamat Orang Tua
    { s: { r: 0, c: 26 }, e: { r: 0, c: 27 } }, // Pekerjaan Orang Tua
    { s: { r: 0, c: 29 }, e: { r: 0, c: 32 } }, // Alamat Wali Siswa
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");

  const data = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  const today = new Date().toISOString().slice(0, 10);

  return {
    filename: `data-siswa-${today}.xlsx`,
    data,
  };
}
