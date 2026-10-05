/**
 * Generator template Excel import siswa.
 *
 * Jalankan: node scripts/generate-template-siswa.mjs
 * Output : public/templates/template-import-siswa.xlsx
 *
 * Header sengaja memakai NAMA KOLOM DATABASE (snake_case) supaya import
 * tidak bergantung pada subtitle/merge yang Easily salah dibaca.
 * Baris 2 = contoh pengisian, baris 3 = petunjuk format.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

/** Urutan kolom template: [header, contoh isi, petunjuk] */
const COLUMNS = [
  ["nama_lengkap*", "Budi Santoso", "Wajib, min 2 karakter"],
  ["nis", "1012345", "Wajib isi NIS atau NISN"],
  ["nisn", "0051234567", "Wajib isi NIS atau NISN"],
  ["nama_panggilan", "Budi", ""],
  ["jenis_kelamin", "L", "L atau P"],
  ["tempat_lahir", "Bandung", ""],
  ["tanggal_lahir", "2008-05-12", "Format YYYY-MM-DD"],
  ["agama", "Islam", "Nama agama, mis. Islam"],
  ["status_dalam_keluarga", "Anak Tunggal", ""],
  ["anak_ke", "1", "Angka positif"],
  ["alamat", "Jl. Merdeka No. 10", ""],
  ["alamat_dusun", "Dusun Suka Maju", ""],
  ["alamat_rt", "001", ""],
  ["alamat_rw", "002", ""],
  ["alamat_desa", "Desa Sukamaju", ""],
  ["alamat_kecamatan", "Cibeunying", ""],
  ["alamat_kabupaten_kota", "Bandung", ""],
  ["nama_ayah", "Ahmad Santoso", ""],
  ["pekerjaan_ayah", "Wiraswasta", ""],
  ["nama_ibu", "Siti Aminah", ""],
  ["pekerjaan_ibu", "Ibu Rumah Tangga", ""],
  ["no_telp_rumah", "022-1234567", ""],
  ["alamat_ortu_dusun", "Dusun Suka Maju", ""],
  ["alamat_ortu_rt", "001", ""],
  ["alamat_ortu_rw", "002", ""],
  ["alamat_ortu_desa", "Desa Sukamaju", ""],
  ["alamat_ortu_kecamatan", "Cibeunying", ""],
  ["alamat_ortu_kabupaten_kota", "Bandung", ""],
  ["nama_wali", "-", "Opsional"],
  ["pekerjaan_wali", "-", "Opsional"],
  ["no_telp_wali", "081234567890", "Opsional"],
  ["alamat_wali_dusun", "-", "Opsional"],
  ["alamat_wali_rt", "-", "Opsional"],
  ["alamat_wali_rw", "-", "Opsional"],
  ["alamat_wali_desa", "-", "Opsional"],
  ["status", "aktif", "aktif / lulus / pindah / keluar"],
];

const headers = COLUMNS.map(([header]) => header);
const sampleRow = COLUMNS.map(([, sample]) => sample);
const hintRow = COLUMNS.map(([, , hint]) => hint);

const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow, hintRow]);
worksheet["!cols"] = headers.map((header) => ({
  wch: Math.max(header.length + 4, 14),
}));

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");

const outDir = path.join(projectRoot, "public", "templates");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "template-import-siswa.xlsx");
writeFileSync(outFile, XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }));

console.log(`Template siswa dibuat: ${outFile}`);
console.log(`Total kolom: ${headers.length}`);