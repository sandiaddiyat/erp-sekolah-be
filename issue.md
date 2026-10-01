# Rencana Implementasi: Modifikasi Struktur Data Siswa Sesuai Standar CSV

## Konteks & Tujuan
Saat ini struktur data Siswa pada aplikasi perlu disesuaikan agar sama persis dengan format data dari file CSV standar sekolah yang terlampir. Pembaruan ini mencakup penambahan berbagai kolom mulai dari data diri yang lebih lengkap, detail alamat terpisah (Dusun, RT, RW, dll.), hingga data rinci untuk Orang Tua dan Wali Siswa. 

Tugas ini bertujuan untuk merancang ulang form Data Siswa (baik tambah maupun edit) beserta modifikasi skema database agar dapat mengakomodasi semua *field* (kolom) baru tersebut dengan tampilan antarmuka yang tetap rapi dan terstandarisasi.

## Analisis Struktur Data Baru (Berdasarkan CSV)

Modifikasi database dan form harus mencakup kelompok data berikut:

### 1. Data Diri Siswa
- `nis` (Nomor Induk Siswa)
- `nisn` (Nomor Induk Siswa Nasional)
- `nama_lengkap` (Nama Siswa)
- `nama_panggilan` (Nama Panggilan)
- `tempat_lahir` (Tempat Lahir)
- `tanggal_lahir` (Tanggal Lahir)
- `jenis_kelamin` (L / P)
- `agama` (Agama)
- `status_dalam_keluarga` (Status dalam Keluarga, cth: Kandung)
- `anak_ke` (Anak ke-)

### 2. Alamat Siswa
- `alamat_dusun`
- `alamat_rt`
- `alamat_rw`
- `alamat_desa`
- `alamat_kecamatan`
- `alamat_kabupaten_kota`

### 3. Data Orang Tua
- `nama_ayah`
- `nama_ibu`
- `pekerjaan_ayah`
- `pekerjaan_ibu`
- `no_telp_rumah` (Nomor Telepon Rumah)
- *Grup Alamat Orang Tua:*
  - `alamat_ortu_dusun`
  - `alamat_ortu_rt`
  - `alamat_ortu_rw`
  - `alamat_ortu_desa`
  - `alamat_ortu_kecamatan`
  - `alamat_ortu_kabupaten_kota`

### 4. Data Wali Siswa (Opsional)
- `nama_wali`
- `pekerjaan_wali`
- `no_telp_wali`
- *Grup Alamat Wali:*
  - `alamat_wali_dusun`
  - `alamat_wali_rt`
  - `alamat_wali_rw`
  - `alamat_wali_desa`

---

## Tahapan Implementasi (Untuk Programmer / AI Assistant)

### Tahap 1: Modifikasi Skema Database & Tipe Data
1. Buka file skema database (misal: file `schema.ts`, `schema.prisma`, atau file *migration* SQL terkait tabel `students`).
2. Tambahkan kolom-kolom baru di atas. Gunakan tipe data `VARCHAR` / `String` untuk sebagian besar input, dan `DATE` untuk `tanggal_lahir`, serta `INTEGER` untuk `anak_ke`.
3. Perbarui tipe data TypeScript/Zod *schema* (`Student`, `StudentFormData`, atau sejenisnya) agar mencerminkan kolom-kolom baru ini.
4. Terapkan perubahan database (*migration / db push*).

### Tahap 2: Modifikasi Form UI (`Siswa Form Dialog`)
1. Buka komponen yang mengelola form modal siswa (biasanya di `src/app/(app)/siswa/_components/student-form-dialog.tsx` atau file serupa).
2. Karena input *field* menjadi sangat banyak, **jangan** menumpuk semua input dalam satu halaman yang panjang. Gunakan komponen `Tabs` atau `Accordion` dari perpustakaan UI (Shadcn UI / Base UI) untuk membagi form menjadi 4 kategori (seperti di atas):
   - Tab 1: **Data Diri**
   - Tab 2: **Alamat**
   - Tab 3: **Orang Tua**
   - Tab 4: **Wali**
3. **Komponen Standar:**
   - Gunakan `Input` standar untuk teks biasa.
   - Gunakan `Select` untuk field yang pilihannya terbatas seperti `jenis_kelamin` (L/P) dan `agama` (Islam, Kristen, Katolik, Hindu, Budha, Konghucu).
   - Pastikan setiap input memiliki label yang menggunakan `FieldLabel` agar desain tetap konsisten dengan form lainnya.

### Tahap 3: Pembaruan Form Action (Backend Logic)
1. Modifikasi *Server Action* penyimpan data (misal `saveStudent` di `siswa-actions.ts`).
2. Ambil dan validasi semua data input baru yang dikirimkan via `FormData`.
3. Sisipkan (*insert* / *update*) field-field baru tersebut ke query database.
4. Tangani kemungkinan jika data Wali atau Orang Tua dikosongkan (jadikan opsional / *nullable*).

### Tahap 4: (Opsional namun Direkomendasikan) Tombol "Samakan Alamat"
Untuk mempermudah pengguna, tambahkan *Checkbox* kecil di Tab Orang Tua yang berbunyi **"Alamat sama dengan siswa"**. Jika dicentang, secara otomatis nilai dusun, rt, rw, desa, dst milik siswa akan disalin ke alamat orang tua.

---
## Kriteria Penerimaan (Acceptance Criteria)
- [ ] Tabel database `students` berhasil diperbarui tanpa menghapus data esensial yang lama.
- [ ] Dialog form tambah/edit siswa memuat semua kolom yang ada di CSV.
- [ ] UI terbagi rapi menggunakan Tab/Accordion sehingga mudah dibaca dan tidak sesak.
- [ ] Menyimpan form akan memasukkan data lengkap ke database.
- [ ] Form edit mampu menampilkan kembali semua data detail siswa, orang tua, wali, dan alamat yang sudah tersimpan sebelumnya.
