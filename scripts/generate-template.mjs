import XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const headers = [
  "Nama Lengkap*",
  "NIP",
  "NIY",
  "NUPTK",
  "Jenis Kelamin",
  "Tempat Lahir",
  "Tanggal Lahir",
  "Telepon",
  "Email",
  "Alamat",
];

// Sheet "Data Pegawai" — header + contoh data
const dataSheet = [
  headers,
  [
    "Ahmad Fauzi, S.Pd",
    "198503152010011001",
    "",
    "",
    "L",
    "Jakarta",
    "1985-03-15",
    "081234567890",
    "ahmad@sekolah.sch.id",
    "Jl. Pendidikan No. 1",
  ],
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(dataSheet);
XLSX.utils.book_append_sheet(wb, ws, "Data Pegawai");

// Sheet "Petunjuk"
const petunjuk = [
  ["Petunjuk Import Data Pegawai", undefined, undefined, undefined, undefined],
  [],
  ["Kolom dengan tanda * wajib diisi.", undefined, undefined, undefined, undefined],
  ["Minimal salah satu NIP/NIY/NUPTK harus terisi.", undefined, undefined, undefined, undefined],
  ["Format tanggal: YYYY-MM-DD (contoh: 2024-01-15).", undefined, undefined, undefined, undefined],
  ["Jenis Kelamin: isi L (Laki-laki) atau P (Perempuan).", undefined, undefined, undefined, undefined],
  [],
  ["Kolom (urutan)", "Nama Kolom", "Wajib", "Ket."],
  ["A", "Nama Lengkap*", "Ya", "minimal 2 karakter"],
  ["B", "NIP", "Tidak", "maks 30 karakter"],
  ["C", "NIY", "Tidak", "maks 30 karakter"],
  ["D", "NUPTK", "Tidak", "maks 30 karakter"],
  ["E", "Jenis Kelamin", "Tidak", "L atau P"],
  ["F", "Tempat Lahir", "Tidak", "-"],
  ["G", "Tanggal Lahir", "Tidak", "YYYY-MM-DD"],
  ["H", "Telepon", "Tidak", "-"],
  ["I", "Email", "Tidak", "-"],
  ["J", "Alamat", "Tidak", "maks 500 karakter"],
];
const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjuk);
XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk");

const outDir = join(__dirname, "..", "public", "templates");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "template-import-pegawai.xlsx");

const wbout = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
writeFileSync(outFile, Buffer.from(wbout));
console.log("Template written to:", outFile);
