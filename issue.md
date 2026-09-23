# Issue: Perbaikan Modal Tambah Pegawai (Foto, Template Excel, Tata Letak)

> Catatan untuk implementer (junior programmer / AI model): Kerjakan per tugas (T1 → T2 → T3) secara berurutan. Jangan refactor di luar cakupan. Semua perubahan UI hanya di `src/app/(app)/pegawai/pegawai-client.tsx` kecuali disebutkan lain. Setelah selesai, jalankan `npm run build` (atau `npx tsc --noEmit`) dan uji manual di `http://192.168.1.115:3000/pegawai`.

---

## Konteks

- Halaman target: `/pegawai` (`src/app/(app)/pegawai/page.tsx` + `pegawai-client.tsx`).
- Referensi pola upload foto: `/siswa` (`src/app/(app)/siswa/siswa-client.tsx`, komponen `SiswaFormDialog`).
- Referensi desain visual: https://school-erp-login-red-xiq6.bolt.host (label, inputan, tab, posisi elemen). Source di D:\Developments\erp-sekolah\Template\Template-ERP-Sekolah
- Branch saat ini: `features/pegawai-photo` — upload foto pegawai **sudah berfungsi** (server action `uploadPegawaiPhotoAction`, kolom `photo_url` sudah ada via migration 0025). Tugas T1 hanya menyamakan **pola/UI** dengan siswa, bukan membangun dari nol.

---

## T1 — Samakan Upload Foto Pegawai dengan Pola Upload Foto Siswa

### Kondisi sekarang (pegawai)
- `PegawaiFormDialog` (tab "Informasi Dasar") memakai `<Input type="file" accept="image/*" capture="user">` langsung terlihat, preview via komponen `Avatar`, upload langsung ke server action `uploadPegawaiPhotoAction` saat file dipilih.

### Kondisi target (meniru siswa, `SiswaFormDialog`)
- Input file **disembunyikan** (`className="hidden"` + `ref={photoInputRef}`).
- Preview foto memakai **kotak 20x20 (size-20) rounded-[14px] dengan border dashed** (`border-dashed border-[#cfe6d4] bg-[#f6fbf7]`), fallback ikon `ImagePlusIcon`.
- Tombol `Upload Foto` (variant outline, styling hijau seperti siswa: `border-[#d7e6dc] text-[#4b8669]`) yang memanggil `photoInputRef.current?.click()`.
- Teks bantuan: `JPG/PNG/WebP maksimal 2 MB.` dan nama file terpilih (`Dipilih: <nama>. `).

### Keputusan penting (IKUTI INI, jangan berimprovisasi)
1. Pegawai **tetap upload langsung ke server** saat file dipilih (pertahankan `handleFileChange` yang memanggil `uploadPegawaiPhotoAction` + validasi 2 MB + tipe image). Yang disamakan hanya **tampilan/UX**, bukan mekanisme upload — siswa menyimpan file via form submit, pegawai via server action terpisah. JANGAN mengubah mekanisme pegawai menjadi ikut form submit.
2. Simpan `photoName` di state untuk teks "Dipilih: ...".
3. Tetap pertahankan tombol X untuk menghapus foto yang sudah terunggah (`setPhotoUrl(null)`).
4. Hapus `capture="user"` (tidak ada di pola siswa, memaksa kamera di mobile).

### Tahapan implementasi
1. Buka `pegawai-client.tsx`, cari blok komentar `{/* Foto pegawai */}` di `PegawaiFormDialog`.
2. Tambah `useRef<HTMLInputElement>(null)` bernama `photoInputRef` dan state `photoName`.
3. Ganti markup blok foto agar identik dengan pola siswa (kotak preview dashed + tombol Upload Foto + hidden input), tapi `onChange` tetap `handleFileChange` (upload langsung).
4. Di `handleFileChange`, tambah `setPhotoName(file.name)`.
5. Saat foto dihapus (tombol X), reset juga `photoName`.
6. Verifikasi import `ImagePlusIcon` dari `lucide-react` (ganti `UserIcon` di fallback jika tidak terpakai — cek dulu apakah dipakai di tempat lain di file ini).

### Kriteria selesai (acceptance)
- [ ] Modal Tambah Pegawai menampilkan kotak preview foto dashed + tombol "Upload Foto", sama seperti modal Tambah Siswa.
- [ ] Setelah pilih file: preview muncul, foto terunggah ke storage (tanpa submit), teks "Dipilih: ..." muncul.
- [ ] Validasi >2 MB dan non-image tetap menampilkan error.
- [ ] Tombol X menghapus foto terunggah.

---

## T2 — Hapus "Unduh Template Excel" di Modal Tambah Pegawai

### Kondisi sekarang
- Di `PegawaiFormDialog`, tab "Informasi Dasar", header tab ada link:
  `<a href="/templates/template-import-pegawai.xlsx" download ...>Unduh template excel</a>`
  (dibungkus bersama judul "Informasi Dasar" dalam `<div className="mb-4 flex items-center justify-between">`).

### Tahapan implementasi
1. Hapus elemen `<a href="/templates/template-import-pegawai.xlsx" ...>` di dalam `PegawaiFormDialog` (JANGAN yang ada di **dialog Import Excel** — dialog terpisah `importOpen` — dan JANGAN menghapus file template dari `public/templates/`).
2. Setelah link dihapus, sederhanakan wrapper header tab "Informasi Dasar": tidak perlu lagi `flex items-center justify-between` jika hanya tersisa judul + deskripsi — cukup blok `space-y-1` seperti tab lain.
3. Cek apakah `DownloadIcon` masih dipakai di tempat lain di file; jika tidak, hapus dari import `lucide-react`.

### Kriteria selesai
- [ ] Modal Tambah Pegawai tidak lagi menampilkan link "Unduh template excel".
- [ ] Dialog "Import Data Pegawai" (tombol Import Excel di halaman) **masih** memiliki link template-nya.
- [ ] Tidak ada unused import (`DownloadIcon`) yang tersisa.

---

## T3 — Samakan Tampilan & Posisi Modal Tambah Pegawai dengan Referensi bolt.host

### Konteks
- Desain referensi: https://school-erp-login-red-xiq6.bolt.host — bandingkan elemen: label field, lebar/posisi input, tab bar, header modal, footer.
- Commit terakhir (`0c5949e fix: lebar & spacing modal tambah pegawai + scroll bar`) sudah menaikkan lebar modal ke `sm:max-w-[1000px]`, tetapi layout masih belum cocok.
- Karena referensi adalah situs eksternal, implementer HARUS membuka kedua URL berdampingan (localhost vs referensi) dan mencocokkan visual — jangan menebak.

### Daftar ketidaksesuaian yang teridentifikasi (periksa & cocokkan satu per satu)
1. **Header modal**: caption "Data kepegawaian" + judul + deskripsi — cek ukuran font, tracking, warna (`#4d9775`, `#183d32`, `#83988e`) dan spacing terhadap referensi.
2. **Tab bar**: posisi tab (`Informasi Dasar / Informasi Kepegawaian / Riwayat Pendidikan / Sertifikasi`) — cek apakah referensi memakai variant `line`, urutan tab yang sama, dan apakah tab aktif di-referensi diberi warna hijau.
3. **Label field**: pegawai memakai komponen `FieldLabel` (`src/features/pegawai/FieldLabel.tsx`) dengan penanda `required`/`optional`. Cek apakah referensi menampilkan indikator opsional dengan cara yang sama (tanda bintang vs teks "opsional").
4. **Grid input**: referensi kemungkinan memakai kolom yang berbeda (mis. 2 kolom penuh vs `sm:grid-cols-2` dengan `col-span` tertentu). Cocokkan urutan & span tiap field: Nama Lengkap, NIP, NIY, NUPTK, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, Agama, lalu seksi Kontak (Telepon, Email, Alamat).
5. **Foto**: posisi foto pada referensi (apakah di atas, di samping nama, atau di kolom sendiri) — sesuaikan setelah T1 diterapkan.
6. **Footer**: tombol Batal/Simpan — cek posisi (kanan vs justify-between), teks, dan caption "Data dapat dilengkapi kembali nanti".

### Tahapan implementasi
1. Buka `http://192.168.1.115:3000/pegawai` → klik "Tambah Pegawai", dan buka https://school-erp-login-red-xiq6.bolt.host di sisi lain. Buat daftar perbedaan konkret (screenshot berdampingan bila perlu) sebelum mengubah kode.
2. Terapkan penyesuaian hanya dengan mengubah className/struktur markup di `PegawaiFormDialog`. Gunakan palet warna hijau yang sudah dipakai proyek (`#185743`, `#e2ece5`, `#f6fbf7`, dst.) — jangan memperkenalkan warna baru di luar palet.
3. Uji responsif: modal harus tetap bisa di-scroll di layar kecil (`max-h-[92vh]` + area konten `overflow-y-auto` sudah ada — jangan dihilangkan).
4. Uji juga modal **Ubah Pegawai** (komponen yang sama, `isEdit=true`) agar tidak rusak.

### Kriteria selesai
- [ ] Header, tab, label, input, dan footer modal Tambah Pegawai visualnya konsisten dengan referensi bolt.host.
- [ ] Tidak ada regresi pada modal Ubah Pegawai.
- [ ] Modal tetap dapat di-scroll pada viewport pendek.
- [ ] `npm run build` lulus tanpa error TypeScript/lint.

---

## Urutan kerja & pengujian akhir

1. T1 → commit terpisah (`feat: samakan upload foto pegawai dengan siswa`).
2. T2 → commit terpisah (`fix: hapus unduh template excel dari modal tambah pegawai`).
3. T3 → commit terpisah (`fix: sesuaikan tata letak modal tambah pegawai dengan referensi desain`).
4. Pengujian manual akhir:
   - Tambah pegawai baru + upload foto → foto tampil di tabel setelah simpan.
   - Ubah pegawai → foto lama tampil, bisa diganti/dihapus.
   - Import Excel tetap berfungsi (template masih bisa diunduh dari dialog import).
   - Cek lint (`npm run lint`) dan build.
