# Rencana Pengembangan: Penambahan Siswa ke Kelas di Form Pendaftaran Siswa

## Latar Belakang
Pada halaman Pendaftaran Siswa (`/akademik/pendaftaran`), saat ini user hanya dapat mengelola data pendaftaran secara umum. Terdapat kebutuhan agar saat user melakukan perubahan (Edit Pendaftaran), user juga dapat langsung **menambahkan/memasukkan siswa tersebut ke dalam kelas tertentu**. 

Dokumen ini berisi panduan dan *roadmap* pengerjaan fitur tersebut yang dirancang agar mudah diikuti oleh Junior Programmer atau AI model yang lebih hemat (*cheaper AI models*).

---

## Spesifikasi Kebutuhan (*Requirements*)
1. Saat mengklik tombol edit pada data pendaftaran, form modal (dialog) yang terbuka harus memiliki opsi untuk memilih **Kelas** tujuan bagi siswa tersebut.
2. Desain tampilan form (termasuk label, select, spasi, dan penempatan tombol) harus mengikuti standar fitur ERP Sekolah (menggunakan palet hijau hutan, komponen dari `shadcn/ui`, `FieldLabel`, dsb. sesuai dengan `AGENTS.md`).
3. Pemilihan kelas harus bergantung pada filter yang relevan (misal: kelas aktif di tahun ajaran saat ini atau sesuai jenjang pendaftaran).
4. Ketika form disimpan, data kelas (*enrollment* siswa) juga harus terupdate di database bersamaan dengan data pendaftaran.

---

## Langkah-langkah Implementasi (*Implementation Steps*)

### 1. Update Schema Zod (Validasi Form)
**File Target:** `src/features/pendaftaran/schema.ts` (atau file skema terkait yang digunakan untuk form Pendaftaran).
* Tambahkan field `kelas_id` ke dalam skema validasi edit pendaftaran (bisa opsional atau wajib, tergantung aturan bisnis).
* Contoh:
  ```typescript
  kelas_id: z.string().uuid("Kelas tidak valid").optional().nullable(),
  ```

### 2. Modifikasi Komponen Dialog Pendaftaran
**File Target:** `src/app/(app)/akademik/pendaftaran/form-dialog.tsx` (atau penamaan komponen sejenis).
* **Akses Data Kelas:** Pastikan komponen form menerima data daftar kelas (prop `kelasOptions` atau di-fetch dari database sebelum di-passing ke client).
* **Tambahkan Input `Select`:**
  - Gunakan `<FieldLabel>` untuk melabeli "Kelas Tujuan".
  - Gunakan komponen `<Select>`, `<SelectTrigger>`, `<SelectValue>`, `<SelectContent>`, `<SelectItem>` dari `@/components/ui/select`.
  - Desain harus proporsional. Pastikan memberikan margin yang cukup pada bagian bawah form (`pb-4` atau `mb-4`) agar elemen tidak mepet dengan tombol "Simpan" & "Batal".
  - Pastikan tombol aksi berada dalam kontainer yang menempel di bawah (misal: div dengan `justify-end` dan jarak yang seragam).

### 3. Update Logika Server Action
**File Target:** Server action pendaftaran (biasanya di `src/features/pendaftaran/service.ts` atau file actions).
* Pada saat fungsi *update* dijalankan, proses juga field `kelas_id`.
* Jika `kelas_id` terisi, periksa apakah siswa sudah memiliki data di tabel `student_enrollments`. 
  - Jika belum: Buat record baru (INSERT).
  - Jika sudah ada dan berbeda kelas: Update record (UPDATE).
* Lakukan pembungkusan (*wrapping*) di dalam Supabase Transaction jika memungkinkan untuk menjaga integritas data (update status pendaftaran & *enrollment* kelas harus berhasil atau gagal bersamaan).

### 4. Update UI Halaman Utama (Pendaftaran Client)
**File Target:** `src/app/(app)/akademik/pendaftaran/pendaftaran-client.tsx`.
* Jika pendaftaran memuat data kelas, tampilkan data `kelasOptions` dan teruskan (passing) ke komponen `FormDialog`.
* Pastikan penerapan remount pada dialog menggunakan teknik `dialogKey` untuk menghindari state React 19 (`useActionState`) yang *stale*:
  ```tsx
  <FormDialog
    key={editing?.id ?? dialogKey} // Sangat penting!
    open={formOpen}
    // ...props lain
  />
  ```

---

## Pedoman UI/UX
* **Warna & Tema:** Gunakan warna bawaan dari Tailwind v4 yang sudah diatur untuk proyek ini (tema hijau-hutan). Jangan menggunakan class sembarang seperti `bg-blue-500`. Gunakan komponen varian default.
* **Scroll Form:** Jika inputan sangat panjang, beri class `overflow-y-auto` pada isi body modal dan pertahankan header + footer yang tetap (sticky) agar rapi.
* **Error Handling:** Tampilkan *toast* error bila siswa gagal ditambahkan ke kelas. Gunakan `<Alert>` atau teks merah yang informatif bila ada konflik (misal: "Siswa sudah terdaftar di kelas lain").

---
**Status:** Dibuat untuk panduan pengembangan selanjutnya.
