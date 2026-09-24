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

  // Mapping header Excel -> field DB (fleksibel terhadap urutan & tanda *).
  const headerLower = (rows[0] ?? []).map((h) =>
    String(h ?? "").replace(/\*/g, "").trim().toLowerCase()
  );
  const findCol = (...candidates: string[]): number | undefined => {
    const idx = headerLower.findIndex((h) =>
      candidates.some((c) => h === c || h.includes(c))
    );
    return idx >= 0 ? idx : undefined;
  };
  const col = {
    nama_lengkap: findCol("nama lengkap"),
    nis: findCol("nis"),
    nisn: findCol("nisn"),
    jenis_kelamin: findCol("jenis kelamin"),
    tempat_lahir: findCol("tempat lahir"),
    tanggal_lahir: findCol("tanggal lahir"),
    nama_ayah: findCol("nama ayah"),
    nama_ibu: findCol("nama ibu"),
    nama_wali: findCol("nama wali"),
    telepon_wali: findCol("telepon"),
    alamat: findCol("alamat"),
    status: findCol("status"),
  };

  if (col.nama_lengkap === undefined) {
    return { error: "Kolom 'Nama Lengkap*' tidak ditemukan di header file." };
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
      jenis_kelamin: jk === "L" || jk === "P" ? jk : null,
      tempat_lahir: cell(row, "tempat_lahir").slice(0, 100) || null,
      tanggal_lahir: toDateValue(cell(row, "tanggal_lahir")),
      nama_ayah: cell(row, "nama_ayah").slice(0, 150) || null,
      nama_ibu: cell(row, "nama_ibu").slice(0, 150) || null,
      nama_wali: cell(row, "nama_wali").slice(0, 150) || null,
      telepon_wali: cell(row, "telepon_wali").slice(0, 30) || null,
      alamat: cell(row, "alamat").slice(0, 500) || null,
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
