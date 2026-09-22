"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { FormState } from "@/lib/types";

export type ImportPegawaiResult = {
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
 * Import data pegawai dari file Excel (kolom identitas dasar saja).
 * Kolom referensi (jabatan, agama, dll.) tidak di-import pada versi pertama.
 */
export async function importPegawai(
  _prevState: FormState,
  formData: FormData
): Promise<ImportPegawaiResult> {
  const guard = await guardAction({
    permission: PERMISSIONS.pegawaiCreate,
    deniedMessage: "Anda tidak punya izin mengimpor data pegawai.",
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
    full_name: findCol("nama lengkap"),
    nip: findCol("nip"),
    niy: findCol("niy"),
    nuptk: findCol("nuptk"),
    jenis_kelamin: findCol("jenis kelamin"),
    tempat_lahir: findCol("tempat lahir"),
    tanggal_lahir: findCol("tanggal lahir"),
    phone: findCol("telepon"),
    email: findCol("email"),
    alamat: findCol("alamat"),
  };

  if (col.full_name === undefined) {
    return { error: "Kolom 'Nama Lengkap*' tidak ditemukan di header file." };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) {
    return { error: "Hanya admin sekolah yang boleh mengimpor data pegawai." };
  }
  const supabase = await createClient();

  const result = {
    success: 0,
    failed: 0,
    errors: [] as { row: number; message: string }[],
  };
  const toInsert: Database["public"]["Tables"]["pegawai"]["Insert"][] = [];

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
    const fullName = cell(row, "full_name");
    if (fullName.length < 2) {
      result.failed++;
      result.errors.push({
        row: excelRow,
        message: "Nama lengkap wajib diisi (min 2 karakter).",
      });
      continue;
    }

    const nip = cell(row, "nip").slice(0, 30);
    const niy = cell(row, "niy").slice(0, 30);
    const nuptk = cell(row, "nuptk").slice(0, 30);
    if (!nip && !niy && !nuptk) {
      result.failed++;
      result.errors.push({
        row: excelRow,
        message: "Isi minimal salah satu: NIP, NIY, atau NUPTK.",
      });
      continue;
    }

    const email = cell(row, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      result.failed++;
      result.errors.push({ row: excelRow, message: "Format email tidak valid." });
      continue;
    }

    const jk = cell(row, "jenis_kelamin");

    toInsert.push({
      school_id: schoolId,
      full_name: fullName,
      nip: nip || null,
      niy: niy || null,
      nuptk: nuptk || null,
      jenis_kelamin: jk === "L" || jk === "P" ? jk : null,
      tempat_lahir: cell(row, "tempat_lahir").slice(0, 100) || null,
      tanggal_lahir: toDateValue(cell(row, "tanggal_lahir")),
      phone: cell(row, "phone").slice(0, 30) || null,
      email: email || null,
      alamat: cell(row, "alamat").slice(0, 500) || null,
      is_active: true,
    });
  }

  if (toInsert.length === 0) {
    return { result };
  }

  const { error } = await supabase.from("pegawai").insert(toInsert);
  if (error) {
    return { error: `Gagal menyimpan data ke database: ${error.message}` };
  }

  result.success = toInsert.length;
  revalidatePath("/pegawai");
  revalidatePath("/dashboard");
  return { result };
}
