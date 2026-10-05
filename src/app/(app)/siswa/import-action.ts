"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import type { FormState } from "@/lib/types";
import { saveSiswaSchema, type SaveSiswaInput } from "@/features/siswa/schema";

export type ImportSiswaResult = {
  result?: {
    success: number;
    failed: number;
    errors: { row: number; message: string }[];
  };
  error?: string;
};

function toDateValue(raw: string): string | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Buang nilai kosong & tanda hubung placeholder dari template. */
function cleanCell(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return "";
  return trimmed;
}

/**
 * Cari baris header: baris pertama yang mengandung "nama_lengkap" (atau
 * "nama siswa"/"nama lengkap") setelah dibersihkan dari tanda `*`.
 * Ini membuat importer tahan terhadap file yang punya baris judul di atasnya.
 */
function detectHeaderRowIndex(rows: unknown[][]): number {
  const candidates = ["nama_lengkap", "nama siswa", "nama lengkap"];
  for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => cleanCell(String(c ?? "")).replace(/\*/g, "").toLowerCase());
    if (candidates.some((c) => cells.includes(c))) return i;
  }
  return 0;
}

/**
 * Import data siswa dari file Excel.
 * Wajib permission `students.import`.
 */
export async function importSiswa(
  _prevState: FormState,
  formData: FormData
): Promise<ImportSiswaResult> {
  const guard = await guardAction({
    permission: PERMISSIONS.studentsImport,
    deniedMessage: "Anda tidak punya izin mengimpor data siswa.",
  });
  if ("error" in guard) return { error: guard.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file Excel terlebih dahulu." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "xls") {
    return { error: "Hanya file .xlsx / .xls yang didukung." };
  }

  let rows: unknown[][];
  try {
    const XLSX = await import("xlsx");
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return { error: "File Excel tidak memiliki sheet." };
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as unknown[][];
  } catch {
    return { error: "Gagal membaca file Excel." };
  }

  if (rows.length === 0) {
    return { error: "File Excel kosong atau tidak memiliki data." };
  }

  const headerIndex = detectHeaderRowIndex(rows);
  const headerRow = rows[headerIndex] ?? [];
  // Kunci header dibersihkan: "Nama Lengkap*" -> "nama_lengkap".
  const headerKeys = (headerRow as unknown[]).map((h) =>
    cleanCell(String(h ?? "")).replace(/\*/g, "").trim().toLowerCase()
  );

  const findCol = (...candidates: string[]): number | undefined => {
    // Cocokkan persis dulu agar probe pendek tidak salah ambil kolom berawalan sama.
    for (const c of candidates) {
      const exact = headerKeys.indexOf(c);
      if (exact >= 0) return exact;
    }
    for (const c of candidates) {
      const idx = headerKeys.findIndex((h) => h.includes(c));
      if (idx >= 0) return idx;
    }
    return undefined;
  };

  const col = {
    nama_lengkap: findCol("nama_lengkap", "nama siswa", "nama lengkap"),
    nis: findCol("nis"),
    nisn: findCol("nisn"),
    nama_panggilan: findCol("nama_panggilan", "nama panggilan"),
    jenis_kelamin: findCol("jenis_kelamin", "jenis kelamin", "l/p"),
    tempat_lahir: findCol("tempat_lahir", "tempat lahir", "tempat"),
    tanggal_lahir: findCol("tanggal_lahir", "tanggal lahir"),
    agama: findCol("agama"),
    status_dalam_keluarga: findCol("status_dalam_keluarga", "status dalam keluarga"),
    anak_ke: findCol("anak_ke", "anak ke"),
    alamat: findCol("alamat"),
    alamat_dusun: findCol("alamat_dusun", "alamat dusun"),
    alamat_rt: findCol("alamat_rt", "alamat rt"),
    alamat_rw: findCol("alamat_rw", "alamat rw"),
    alamat_desa: findCol("alamat_desa", "alamat desa"),
    alamat_kecamatan: findCol("alamat_kecamatan", "alamat kecamatan"),
    alamat_kabupaten_kota: findCol("alamat_kabupaten_kota", "alamat kabupaten_kota"),
    nama_ayah: findCol("nama_ayah", "nama ayah"),
    pekerjaan_ayah: findCol("pekerjaan_ayah", "pekerjaan ayah"),
    nama_ibu: findCol("nama_ibu", "nama ibu"),
    pekerjaan_ibu: findCol("pekerjaan_ibu", "pekerjaan ibu"),
    no_telp_rumah: findCol("no_telp_rumah", "telepon rumah"),
    alamat_ortu_dusun: findCol("alamat_ortu_dusun", "alamat ortu dusun"),
    alamat_ortu_rt: findCol("alamat_ortu_rt", "alamat ortu rt"),
    alamat_ortu_rw: findCol("alamat_ortu_rw", "alamat ortu rw"),
    alamat_ortu_desa: findCol("alamat_ortu_desa", "alamat ortu desa"),
    alamat_ortu_kecamatan: findCol("alamat_ortu_kecamatan", "alamat ortu kecamatan"),
    alamat_ortu_kabupaten_kota: findCol(
      "alamat_ortu_kabupaten_kota",
      "alamat ortu kabupaten_kota"
    ),
    nama_wali: findCol("nama_wali", "nama wali"),
    pekerjaan_wali: findCol("pekerjaan_wali", "pekerjaan wali"),
    no_telp_wali: findCol("no_telp_wali", "telepon wali"),
    alamat_wali_dusun: findCol("alamat_wali_dusun", "alamat wali dusun"),
    alamat_wali_rt: findCol("alamat_wali_rt", "alamat wali rt"),
    alamat_wali_rw: findCol("alamat_wali_rw", "alamat wali rw"),
    alamat_wali_desa: findCol("alamat_wali_desa", "alamat wali desa"),
    status: findCol("status"),
  };

  if (col.nama_lengkap === undefined) {
    return {
      error: "Kolom 'nama_lengkap' / 'Nama Lengkap' tidak ditemukan di header file.",
    };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) {
    return { error: "Hanya admin sekolah yang boleh mengimpor data siswa." };
  }
  const supabase = await createClient();

  // Peta nama agama -> id (template memakai nama, bukan UUID).
  const { data: agamaRows } = await supabase.from("agama").select("id, nama_agama");
  const agamaByName = new Map<string, string>();
  for (const row of agamaRows ?? []) {
    const name = String(row.nama_agama ?? "").trim().toLowerCase();
    if (name) agamaByName.set(name, row.id);
  }

  const result = {
    success: 0,
    failed: 0,
    errors: [] as { row: number; message: string }[],
  };
  const toInsert: Database["public"]["Tables"]["students"]["Insert"][] = [];

  const cell = (row: unknown[], key: keyof typeof col): string => {
    const idx = col[key];
    if (idx === undefined) return "";
    const value = row[idx];
    if (typeof value === "number") return String(value);
    return cleanCell(String(value ?? ""));
  };

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every((c) => cleanCell(String(c ?? "")) === "")) {
      continue;
    }

    const excelRow = i + 1;

    // Susun payload lalu validasi dengan saveSiswaSchema (sumber kebenaran tunggal).
    const agamaName = cell(row, "agama").toLowerCase();
    const candidate = {
      nama_lengkap: cell(row, "nama_lengkap"),
      nama_panggilan: cell(row, "nama_panggilan"),
      nis: cell(row, "nis"),
      nisn: cell(row, "nisn"),
      jenis_kelamin: cell(row, "jenis_kelamin").toUpperCase(),
      tempat_lahir: cell(row, "tempat_lahir"),
      tanggal_lahir: toDateValue(cell(row, "tanggal_lahir")) ?? "",
      agama_id: agamaByName.get(agamaName) ?? "",
      status_dalam_keluarga: cell(row, "status_dalam_keluarga"),
      anak_ke: cell(row, "anak_ke"),
      alamat: cell(row, "alamat"),
      alamat_dusun: cell(row, "alamat_dusun"),
      alamat_rt: cell(row, "alamat_rt"),
      alamat_rw: cell(row, "alamat_rw"),
      alamat_desa: cell(row, "alamat_desa"),
      alamat_kecamatan: cell(row, "alamat_kecamatan"),
      alamat_kabupaten_kota: cell(row, "alamat_kabupaten_kota"),
      nama_ayah: cell(row, "nama_ayah"),
      pekerjaan_ayah: cell(row, "pekerjaan_ayah"),
      nama_ibu: cell(row, "nama_ibu"),
      pekerjaan_ibu: cell(row, "pekerjaan_ibu"),
      no_telp_rumah: cell(row, "no_telp_rumah"),
      alamat_ortu_dusun: cell(row, "alamat_ortu_dusun"),
      alamat_ortu_rt: cell(row, "alamat_ortu_rt"),
      alamat_ortu_rw: cell(row, "alamat_ortu_rw"),
      alamat_ortu_desa: cell(row, "alamat_ortu_desa"),
      alamat_ortu_kecamatan: cell(row, "alamat_ortu_kecamatan"),
      alamat_ortu_kabupaten_kota: cell(row, "alamat_ortu_kabupaten_kota"),
      nama_wali: cell(row, "nama_wali"),
      pekerjaan_wali: cell(row, "pekerjaan_wali"),
      no_telp_wali: cell(row, "no_telp_wali"),
      alamat_wali_dusun: cell(row, "alamat_wali_dusun"),
      alamat_wali_rt: cell(row, "alamat_wali_rt"),
      alamat_wali_rw: cell(row, "alamat_wali_rw"),
      alamat_wali_desa: cell(row, "alamat_wali_desa"),
      status: cell(row, "status").toLowerCase() || "aktif",
    };

    const parsed = saveSiswaSchema.safeParse(candidate);
    if (!parsed.success) {
      result.failed += 1;
      const issue = parsed.error.issues[0];
      result.errors.push({
        row: excelRow,
        message: `${issue?.path.join(".") || "data"}: ${issue?.message ?? "Data tidak valid."}`,
      });
      continue;
    }

    const valid: SaveSiswaInput = parsed.data;
    toInsert.push({
      school_id: schoolId,
      nama_lengkap: valid.nama_lengkap,
      nis: valid.nis ?? null,
      nisn: valid.nisn ?? null,
      nama_panggilan: valid.nama_panggilan ?? null,
      jenis_kelamin: valid.jenis_kelamin ?? null,
      tempat_lahir: valid.tempat_lahir ?? null,
      tanggal_lahir: valid.tanggal_lahir ?? null,
      agama_id: valid.agama_id ?? null,
      status_dalam_keluarga: valid.status_dalam_keluarga ?? null,
      anak_ke: valid.anak_ke ?? null,
      alamat: valid.alamat ?? null,
      alamat_dusun: valid.alamat_dusun ?? null,
      alamat_rt: valid.alamat_rt ?? null,
      alamat_rw: valid.alamat_rw ?? null,
      alamat_desa: valid.alamat_desa ?? null,
      alamat_kecamatan: valid.alamat_kecamatan ?? null,
      alamat_kabupaten_kota: valid.alamat_kabupaten_kota ?? null,
      nama_ayah: valid.nama_ayah ?? null,
      pekerjaan_ayah: valid.pekerjaan_ayah ?? null,
      nama_ibu: valid.nama_ibu ?? null,
      pekerjaan_ibu: valid.pekerjaan_ibu ?? null,
      no_telp_rumah: valid.no_telp_rumah ?? null,
      alamat_ortu_dusun: valid.alamat_ortu_dusun ?? null,
      alamat_ortu_rt: valid.alamat_ortu_rt ?? null,
      alamat_ortu_rw: valid.alamat_ortu_rw ?? null,
      alamat_ortu_desa: valid.alamat_ortu_desa ?? null,
      alamat_ortu_kecamatan: valid.alamat_ortu_kecamatan ?? null,
      alamat_ortu_kabupaten_kota: valid.alamat_ortu_kabupaten_kota ?? null,
      nama_wali: valid.nama_wali ?? null,
      pekerjaan_wali: valid.pekerjaan_wali ?? null,
      no_telp_wali: valid.no_telp_wali ?? null,
      alamat_wali_dusun: valid.alamat_wali_dusun ?? null,
      alamat_wali_rt: valid.alamat_wali_rt ?? null,
      alamat_wali_rw: valid.alamat_wali_rw ?? null,
      alamat_wali_desa: valid.alamat_wali_desa ?? null,
      status: valid.status,
    });
  }

  if (toInsert.length === 0) {
    return { result };
  }

  const { error } = await supabase.from("students").insert(toInsert);
  if (error) {
    return { error: serverError(error, "Gagal menyimpan data ke database.") };
  }

  result.success = toInsert.length;
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
  return { result };
}
