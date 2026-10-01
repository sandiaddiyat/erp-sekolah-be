const XLSX = require("xlsx");
const fs = require("fs");

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
  "Pekerjaan Wali Siswa"
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
  "", ""
];

const dataRows = [
  [
    1, "4444", "1010101010", "Nama Lengkap Siswa 1", "Siswa 1", "Tempat1", "11/10/2015", "L",
    "Islam", "Kandung", 3,
    "Mawacara", "1", "2", "Sumberrkah", "Gemahripah", "Gemahripah",
    "Nama Ayah 1", "Nama Ibu 1",
    "Mawacara", "1", "2", "Sumberrkah", "Gemahripah", "Gemahripah",
    "81578049508",
    "Wiraswasta", "Polri",
    "Nama Wali",
    "", "", "", "",
    "", ""
  ]
];

const ws = XLSX.utils.aoa_to_sheet([header1, header2, ...dataRows]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");

ws["!merges"] = [
  { s: { r: 0, c: 11 }, e: { r: 0, c: 16 } }, // Alamat
  { s: { r: 0, c: 17 }, e: { r: 0, c: 18 } }, // Nama Orang Tua
  { s: { r: 0, c: 19 }, e: { r: 0, c: 24 } }, // Alamat Orang Tua
  { s: { r: 0, c: 26 }, e: { r: 0, c: 27 } }, // Pekerjaan Orang Tua
  { s: { r: 0, c: 29 }, e: { r: 0, c: 32 } }, // Alamat Wali Siswa
];

fs.writeFileSync(
  "public/templates/template-import-siswa.xlsx",
  XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
);
console.log("Template created.");
