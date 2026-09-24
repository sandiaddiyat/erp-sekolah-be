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
        item.telepon_wali ?? "",
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

  const headers = [
    "Nama Lengkap",
    "NIS",
    "NISN",
    "Jenis Kelamin",
    "Tempat Lahir",
    "Tanggal Lahir",
    "Agama",
    "Nama Ayah",
    "Nama Ibu",
    "Nama Wali",
    "Telepon Wali",
    "Alamat",
    "Status",
  ];

  const rows: ExportRow[] = siswaList.map((item) => ({
    "Nama Lengkap": item.nama_lengkap ?? "",
    NIS: item.nis ?? "",
    NISN: item.nisn ?? "",
    "Jenis Kelamin":
      item.jenis_kelamin === "L"
        ? "Laki-laki"
        : item.jenis_kelamin === "P"
          ? "Perempuan"
          : "",
    "Tempat Lahir": item.tempat_lahir ?? "",
    "Tanggal Lahir": item.tanggal_lahir ?? "",
    Agama: agamaName.get(item.agama_id ?? "") ?? "",
    "Nama Ayah": item.nama_ayah ?? "",
    "Nama Ibu": item.nama_ibu ?? "",
    "Nama Wali": item.nama_wali ?? "",
    "Telepon Wali": item.telepon_wali ?? "",
    Alamat: item.alamat ?? "",
    Status: item.status ?? "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(10, header.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");

  const data = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  const today = new Date().toISOString().slice(0, 10);

  return {
    filename: `data-siswa-${today}.xlsx`,
    data,
  };
}
