"use server";

import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type ExportPegawaiResult = {
  filename?: string;
  data?: string;
  error?: string;
};

export type ExportPegawaiFilter = {
  query?: string;
  gender?: string;
  status?: string;
  jabatan?: string;
  unit?: string;
  masukDari?: string;
  masukSampai?: string;
};

type ExportRow = Record<string, string | number>;

/**
 * Unduh data pegawai dalam file Excel (.xlsx).
 * Jika filter diisi, hanya pegawai yang cocok dengan filter yang diunduh.
 * Wajib permission `pegawai.export`.
 */
export async function exportPegawai(
  filter: ExportPegawaiFilter = {}
): Promise<ExportPegawaiResult> {
  const guard = await guardAction({
    permission: PERMISSIONS.pegawaiExport,
    deniedMessage: "Anda tidak punya izin mengunduh data pegawai.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();

  const [pegawaiResult, statusResult, unitResult, golonganResult, pegawaiJabatanResult, jabatanResult] =
    await Promise.all([
      supabase.from("pegawai").select("*").order("full_name"),
      supabase.from("status_kepegawaian").select("id, nama_status"),
      supabase.from("unit_kerja").select("id, nama_unit"),
      supabase.from("golongan").select("id, kode_golongan"),
      supabase.from("pegawai_jabatan").select("pegawai_id, jabatan_id, is_utama"),
      supabase.from("jabatan").select("id, nama_jabatan"),
    ]);

  const loadError =
    pegawaiResult.error ??
    statusResult.error ??
    unitResult.error ??
    golonganResult.error ??
    pegawaiJabatanResult.error ??
    jabatanResult.error;
  if (loadError) return { error: "Gagal memuat data pegawai." };

  const statusName = new Map(
    (statusResult.data ?? []).map((item) => [item.id, item.nama_status])
  );
  const unitName = new Map(
    (unitResult.data ?? []).map((item) => [item.id, item.nama_unit])
  );
  const golonganCode = new Map(
    (golonganResult.data ?? []).map((item) => [item.id, item.kode_golongan])
  );
  const jabatanName = new Map(
    (jabatanResult.data ?? []).map((item) => [item.id, item.nama_jabatan])
  );

  const jabatanUtama = new Map<string, string>();
  for (const row of pegawaiJabatanResult.data ?? []) {
    if (!row.is_utama) continue;
    const nama = jabatanName.get(row.jabatan_id);
    if (nama) jabatanUtama.set(row.pegawai_id, nama);
  }

  let pegawaiList = pegawaiResult.data ?? [];

  const needle = (filter.query ?? "").trim().toLowerCase();
  if (needle) {
    pegawaiList = pegawaiList.filter((item) => {
      const jabatanGabungan = (pegawaiJabatanResult.data ?? [])
        .filter((row) => row.pegawai_id === item.id)
        .map((row) => jabatanName.get(row.jabatan_id) ?? "")
        .join(" ");
      return [
        item.full_name ?? "",
        item.nip ?? "",
        item.niy ?? "",
        item.nuptk ?? "",
        item.phone ?? "",
        item.email ?? "",
        jabatanGabungan,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }

  if (filter.gender) {
    pegawaiList = pegawaiList.filter((item) => item.jenis_kelamin === filter.gender);
  }
  if (filter.status) {
    pegawaiList = pegawaiList.filter(
      (item) => (item.status_kepegawaian_id ?? "") === filter.status
    );
  }
  if (filter.jabatan) {
    pegawaiList = pegawaiList.filter(
      (item) => jabatanUtama.get(item.id) === filter.jabatan
    );
  }
  if (filter.unit) {
    pegawaiList = pegawaiList.filter(
      (item) => (item.unit_kerja_id ?? "") === filter.unit
    );
  }
  if (filter.masukDari) {
    pegawaiList = pegawaiList.filter((item) => {
      const masuk = (item.tahun_masuk ?? "").slice(0, 10);
      return !!masuk && masuk >= filter.masukDari!;
    });
  }
  if (filter.masukSampai) {
    pegawaiList = pegawaiList.filter((item) => {
      const masuk = (item.tahun_masuk ?? "").slice(0, 10);
      return !!masuk && masuk <= filter.masukSampai!;
    });
  }

  const XLSX = await import("xlsx");

  const headers = [
    "Nama",
    "NIP",
    "NIY",
    "NUPTK",
    "Jenis Kelamin",
    "Telepon",
    "Email",
    "Status Kepegawaian",
    "Jabatan Utama",
    "Golongan",
    "Unit Kerja",
    "Tahun Masuk",
    "Status Aktif",
  ];

  const rows: ExportRow[] = pegawaiList.map((item) => ({
    Nama: item.full_name ?? "",
    NIP: item.nip ?? "",
    NIY: item.niy ?? "",
    NUPTK: item.nuptk ?? "",
    "Jenis Kelamin":
      item.jenis_kelamin === "L"
        ? "Laki-laki"
        : item.jenis_kelamin === "P"
          ? "Perempuan"
          : "",
    Telepon: item.phone ?? "",
    Email: item.email ?? "",
    "Status Kepegawaian":
      statusName.get(item.status_kepegawaian_id ?? "") ?? "",
    "Jabatan Utama": jabatanUtama.get(item.id) ?? "",
    Golongan: golonganCode.get(item.golongan_id ?? "") ?? "",
    "Unit Kerja": unitName.get(item.unit_kerja_id ?? "") ?? "",
    "Tahun Masuk": item.tahun_masuk ?? "",
    "Status Aktif": item.is_active ? "Aktif" : "Nonaktif",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });
  worksheet["!cols"] = headers.map((header) => ({ wch: Math.max(10, header.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data Pegawai");

  const data = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  const today = new Date().toISOString().slice(0, 10);

  return {
    filename: `data-pegawai-${today}.xlsx`,
    data,
  };
}
