"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { FormState } from "@/lib/types";

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

/**
 * Import data siswa dari file Excel (kolom biodata dasar saja).
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

  if (rows.length < 2) {
    return { error: "File Excel kosong atau tidak memiliki data." };
  }

  // Mapping header Excel (2 baris) -> field DB (fleksibel terhadap urutan & tanda *).
  const header1 = (rows[0] ?? []) as string[];
  const header2 = (rows[1] ?? []) as string[];
  
  let currentGroup = "";
  const headerLower = header1.map((h1, i) => {
    const h1Str = String(h1 ?? "").replace(/\*/g, "").trim().toLowerCase();
    if (h1Str) currentGroup = h1Str;
    const h2Str = String(header2[i] ?? "").replace(/\*/g, "").trim().toLowerCase();
    
    if (currentGroup && h2Str) {
      return `${currentGroup} ${h2Str}`;
    }
    return h1Str || h2Str || currentGroup;
  });

  const findCol = (...candidates: string[]): number | undefined => {
    const idx = headerLower.findIndex((h) =>
      candidates.some((c) => h === c || h.includes(c))
    );
    return idx >= 0 ? idx : undefined;
  };

  const col = {
    nama_lengkap: findCol("nama siswa", "nama lengkap"),
    nis: findCol("nis"),
    nisn: findCol("nisn"),
    nama_panggilan: findCol("nama panggilan"),
    jenis_kelamin: findCol("l/p", "jenis kelamin"),
    tempat_lahir: findCol("tempat"),
    tanggal_lahir: findCol("tanggal lahir"),
    agama: findCol("agama"),
    status_dalam_keluarga: findCol("status dalam keluarga"),
    anak_ke: findCol("anak ke"),
    alamat: findCol("alamat"), // will probably hit the first 'alamat' group
    alamat_dusun: findCol("alamat dusun"),
    alamat_rt: findCol("alamat rt"),
    alamat_rw: findCol("alamat rw"),
    alamat_desa: findCol("alamat desa"),
    alamat_kecamatan: findCol("alamat kecamatan"),
    alamat_kabupaten_kota: findCol("alamat kab./kota", "alamat kab/kota", "alamat kabupaten"),
    nama_ayah: findCol("nama orang tua: ayah"),
    nama_ibu: findCol("nama orang tua: ibu"),
    pekerjaan_ayah: findCol("pekerjaan orang tua : ayah"),
    pekerjaan_ibu: findCol("pekerjaan orang tua : ibu"),
    no_telp_rumah: findCol("nomor telepon rumah"),
    alamat_ortu_dusun: findCol("alamat orang tua dusun"),
    alamat_ortu_rt: findCol("alamat orang tua rt"),
    alamat_ortu_rw: findCol("alamat orang tua rw"),
    alamat_ortu_desa: findCol("alamat orang tua desa"),
    alamat_ortu_kecamatan: findCol("alamat orang tua kecamatan"),
    alamat_ortu_kabupaten_kota: findCol("alamat orang tua kab./kota", "alamat orang tua kab/kota", "alamat orang tua kabupaten"),
    nama_wali: findCol("nama wali siswa", "nama wali"),
    pekerjaan_wali: findCol("pekerjaan wali siswa", "pekerjaan wali"),
    alamat_wali_dusun: findCol("alamat wali siswa dusun"),
    alamat_wali_rt: findCol("alamat wali siswa rt"),
    alamat_wali_rw: findCol("alamat wali siswa rw"),
    alamat_wali_desa: findCol("alamat wali siswa desa"),
    no_telp_wali: findCol("nomor telepon wali siswa", "telepon wali"),
    status: findCol("status"),
  };

  if (col.nama_lengkap === undefined) {
    return { error: "Kolom 'Nama Siswa' atau 'Nama Lengkap' tidak ditemukan di header file." };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) {
    return { error: "Hanya admin sekolah yang boleh mengimpor data siswa." };
  }
  const supabase = await createClient();

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
    return String(value ?? "").trim();
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.every((c) => String(c ?? "").trim() === "")) {
      continue;
    }

    const excelRow = i + 1;
    const namaLengkap = cell(row, "nama_lengkap");
    if (namaLengkap.length < 2) {
      result.failed++;
      result.errors.push({
        row: excelRow,
        message: "Nama lengkap wajib diisi (min 2 karakter).",
      });
      continue;
    }

    const nis = cell(row, "nis").slice(0, 30);
    const nisn = cell(row, "nisn").slice(0, 20);
    if (!nis && !nisn) {
      result.failed++;
      result.errors.push({
        row: excelRow,
        message: "Isi minimal salah satu: NIS atau NISN.",
      });
      continue;
    }

    const jk = cell(row, "jenis_kelamin");
    const statusRaw = cell(row, "status").toLowerCase();
    const statusValid = ["aktif", "lulus", "pindah", "keluar"].includes(statusRaw)
      ? (statusRaw as "aktif" | "lulus" | "pindah" | "keluar")
      : "aktif";

    toInsert.push({
      school_id: schoolId,
      nama_lengkap: namaLengkap,
      nis: nis || null,
      nisn: nisn || null,
      nama_panggilan: cell(row, "nama_panggilan").slice(0, 100) || null,
      jenis_kelamin: jk === "L" || jk === "P" ? jk : null,
      tempat_lahir: cell(row, "tempat_lahir").slice(0, 100) || null,
      tanggal_lahir: toDateValue(cell(row, "tanggal_lahir")),
      status_dalam_keluarga: cell(row, "status_dalam_keluarga").slice(0, 50) || null,
      anak_ke: parseInt(cell(row, "anak_ke")) || null,
      alamat: cell(row, "alamat").slice(0, 500) || null,
      alamat_dusun: cell(row, "alamat_dusun").slice(0, 100) || null,
      alamat_rt: cell(row, "alamat_rt").slice(0, 10) || null,
      alamat_rw: cell(row, "alamat_rw").slice(0, 10) || null,
      alamat_desa: cell(row, "alamat_desa").slice(0, 100) || null,
      alamat_kecamatan: cell(row, "alamat_kecamatan").slice(0, 100) || null,
      alamat_kabupaten_kota: cell(row, "alamat_kabupaten_kota").slice(0, 100) || null,
      nama_ayah: cell(row, "nama_ayah").slice(0, 150) || null,
      nama_ibu: cell(row, "nama_ibu").slice(0, 150) || null,
      pekerjaan_ayah: cell(row, "pekerjaan_ayah").slice(0, 100) || null,
      pekerjaan_ibu: cell(row, "pekerjaan_ibu").slice(0, 100) || null,
      no_telp_rumah: cell(row, "no_telp_rumah").slice(0, 30) || null,
      alamat_ortu_dusun: cell(row, "alamat_ortu_dusun").slice(0, 100) || null,
      alamat_ortu_rt: cell(row, "alamat_ortu_rt").slice(0, 10) || null,
      alamat_ortu_rw: cell(row, "alamat_ortu_rw").slice(0, 10) || null,
      alamat_ortu_desa: cell(row, "alamat_ortu_desa").slice(0, 100) || null,
      alamat_ortu_kecamatan: cell(row, "alamat_ortu_kecamatan").slice(0, 100) || null,
      alamat_ortu_kabupaten_kota: cell(row, "alamat_ortu_kabupaten_kota").slice(0, 100) || null,
      nama_wali: cell(row, "nama_wali").slice(0, 150) || null,
      pekerjaan_wali: cell(row, "pekerjaan_wali").slice(0, 100) || null,
      no_telp_wali: cell(row, "no_telp_wali").slice(0, 30) || null,
      alamat_wali_dusun: cell(row, "alamat_wali_dusun").slice(0, 100) || null,
      alamat_wali_rt: cell(row, "alamat_wali_rt").slice(0, 10) || null,
      alamat_wali_rw: cell(row, "alamat_wali_rw").slice(0, 10) || null,
      alamat_wali_desa: cell(row, "alamat_wali_desa").slice(0, 100) || null,
      status: statusValid,
    });
  }

  if (toInsert.length === 0) {
    return { result };
  }

  const { error } = await supabase.from("students").insert(toInsert);
  if (error) {
    return { error: `Gagal menyimpan data ke database: ${error.message}` };
  }

  result.success = toInsert.length;
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
  return { result };
}
