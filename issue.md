# Perencanaan Tugas: Penambahan Siswa Baru ke Dalam Kelas (Mode Edit Massal)

Dokumen ini berisi pedoman teknis untuk mengembangkan fitur pada Modal Edit Pendaftaran. Fokus tugas ini adalah bagaimana sistem memungkinkan Admin untuk menambahkan siswa baru (yang belum mendapatkan kelas) ke dalam rombongan kelas yang sedang di-edit.

---

## 1. Modifikasi Query Database & UI Tabel (Modal Edit)
**Konteks:** Pada saat modal Edit dibuka, tabel tidak boleh hanya menampilkan anak yang sudah ada di kelas tersebut, tetapi juga harus memunculkan calon anak baru agar bisa dipilih.

**Tahapan Implementasi:**
1. **Penggabungan Data (Backend Fetch):** 
   - Ubah *query fetch* siswa khusus untuk Modal Edit. 
   - *Query* harus menarik dua jenis data sekaligus: **(A) Siswa yang sudah terdaftar di kelas tersebut**, digabung dengan **(B) Siswa yang berstatus bebas (belum masuk kelas manapun di tahun ajaran ini)**.
2. **Pembeda Visual (UI Frontend):**
   - Di dalam tabel modal, tambahkan kolom penanda atau *Badge*.
   - Beri *Badge* abu-abu bertuliskan `"Sudah Terdaftar"` untuk siswa kelompok (A).
   - Beri *Badge* hijau bertuliskan `"Belum Terdaftar"` untuk siswa kelompok (B).

---

## 2. Logika Pemilihan Siswa (State Management)
**Konteks:** Mekanisme centang (*checkbox*) harus pintar untuk mendeteksi penambahan dan pengurangan siswa secara beriringan.

**Tahapan Implementasi:**
1. **Auto-Check (Pre-fill Data):** 
   - Saat modal terbuka, secara otomatis centang (*checked*) seluruh kotak untuk kelompok siswa (A).
   - Biarkan siswa kelompok (B) dalam keadaan kotak kosong (*unchecked*).
2. **Perilaku Checkbox:** 
   - Jika admin **mencentang** kotak pada siswa (B), itu artinya aksi penambahan (Insert).
   - Jika admin **menghilangkan centang** kotak pada siswa (A), itu artinya aksi pengeluaran/pencabutan dari kelas (Delete).

---

## 3. Logika Sinkronisasi Database (Server Action)
**Konteks:** Menghindari *error* duplikasi ID (Primary Key constraint) jika sistem hanya melakukan insert buta.

**Tahapan Implementasi:**
Pada fungsi penyimpan `onSubmit` di *backend*:
1. **Ambil Data Terbaru:** Terima *array ID Siswa* (Kumpulan kotak yang tercentang dari *form frontend*).
2. **Lakukan Diffing (Perbandingan):** 
   - Bandingkan *array* ID terbaru dengan data ID siswa di database untuk kelas tersebut.
3. **Eksekusi Hapus (Delete):** Hapus catatan pendaftaran pada *database* khusus untuk siswa yang ID-nya hilang dari *array* baru (siswa yang un-check).
4. **Eksekusi Tambah (Insert):** Masukkan catatan pendaftaran baru HANYA untuk siswa yang ID-nya baru muncul di *array* baru, dan lewati (*skip*) siswa yang memang dari awal sudah terdaftar.

---

## Kriteria Penerimaan (Acceptance Criteria)
1. Tabel pada mode edit sukses menampilkan gabungan siswa lama dan siswa bebas.
2. Centang otomatis berfungsi akurat (anak lama tercentang, anak bebas tidak).
3. Saat diklik Simpan, sistem berhasil menyimpan perubahan secara presisi: siswa baru sukses masuk kelas, dan siswa yang centangnya dicabut sukses terhapus dari kelas tersebut, tanpa menyebabkan error duplikasi di database.