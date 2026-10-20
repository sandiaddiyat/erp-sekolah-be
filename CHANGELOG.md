# Changelog

> Semua perubahan signifikan (fitur baru, perbaikan bug, atau perubahan arsitektur) pada proyek ERP Sekolah didokumentasikan di dalam file ini. File ini juga berfungsi sebagai memori lintas-sesi bagi *programmer* maupun model AI yang terlibat.

Format penulisan berdasarkan [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

---

## [Unreleased]

### Added (Ditambahkan)
- **Dokumentasi Terpusat (`knowledge/`)**: Pembuatan serangkaian dokumen untuk memandu pengembangan (dapat dibaca oleh manusia maupun AI) agar standar tetap konsisten:
  - `prd.md`: Ringkasan spesifikasi kebutuhan produk.
  - `design.md`: Standar *styling*, warna (*forest green*), referensi ukuran, dan *UI templates* berbasis `shadcn`.
  - `ARCHITECTURE.md`: Dokumentasi struktur folder, alur *request*, hierarki data dan pola aplikasi.
  - `TECH_STACK.md`: Dokumentasi stack teknologi (Next.js 16, React 19) dan aturan penulisan kode.
  - `DATA_MODEL.md`: Pemetaan relasi tabel database PostgreSQL dan panduan *Row Level Security (RLS)*.
  - `API.md`: Penjelasan mengenai *Server Actions* (pengganti REST API) untuk operasi *CRUD*.
  - `DECISIONS.md`: Keputusan teknis arsitektur (*ADR*) agar tidak ada perulangan usulan yang sudah pernah ditolak (misal, tidak menggunakan *Redux*, dll).
  - `TESTING.md`: Panduan implementasi tes (Vitest dan React Testing Library).
- Pembaruan `AGENTS.md` untuk menyertakan ringkasan perintah esensial (`npm run dev`, `build`) serta 7 aturan wajib (*golden rules*).
- Pembuatan file `CHANGELOG.md` ini untuk menyimpan catatan lintas-sesi.
- **Master Kelas (Issue #100)**: Perubahan additive pada tabel `classes` agar lebih lengkap untuk operasional:
  - Kolom baru: `class_code` (kode internal, unik per sekolah), `status` (aktif/nonaktif/arsip, default `aktif`), `shift` (pagi/siang, untuk sekolah sesi ganda), `created_by` (audit).
  - Unique index `(academic_year_id, grade_id, name)` — mencegah nama kelas ganda di tingkat & tahun ajaran yang sama.
  - Trigger `trg_classes_updated_at` (sebelumnya hilang sejak migrasi 0018).
  - Validasi backend: `major_id` wajib untuk jenjang SMA/SMK dan harus kosong untuk TK/SD/SMP; pesan error jelas untuk duplikat nama kelas dan kode kelas.
  - Fungsi `countActiveStudentsInClass` + validasi kapasitas saat menambahkan siswa (single, bulk, dan diff sync) — menolak jika siswa aktif sudah mencapai `capacity`.
  - UI: form kelas punya pilih Jenjang → Tingkat terfilter → Jurusan terfilter (hanya untuk SMA/SMK); field Kode Kelas dan Status; daftar kelas menampilkan badge status + filter status + okupansi kapasitas (`terisi/kapasitas`); dialog detail menampilkan kode kelas, status, shift, dan sisa kapasitas.
   - Salin kelas dari tahun ajaran sebelumnya kini menyalin `status` dan membuat `class_code` baru otomatis (format `<kode>-<tahun ajaran>`, unik).
- **Sesi Ganda (lanjutan Issue #100)**: Dukungan sekolah dengan 2 sesi masuk (pagi/siang):
  - Kolom `has_double_sessions` (boolean, default `false`) pada tabel `schools` (migrasi 0042).
  - Profil sekolah menampilkan checkbox "Aktifkan sesi ganda (pagi / siang)".
  - Form kelas menampilkan field Shift (pagi/siang) hanya saat sekolah mengaktifkan sesi ganda; nilai tersimpan di kolom `classes.shift`.
  - Migration: `supabase/migrations/0041_classes_enhancement.sql`.
- **Penempatan Siswa ke Kelas (Issue #104)**: Halaman baru `/akademik/penempatan` untuk menempatkan siswa dengan tiga mode:
  - **Mode Manual**: tempatkan siswa satu per satu; server menolak bila kelas sudah penuh, kelas tidak sesuai tahun ajaran, atau siswa sudah terdaftar.
  - **Mode Semi-otomatis**: `generateDraftPlacement` membagikan siswa yang belum ditempatkan ke kelas secara round-robin dan melewati kelas yang penuh, menghasilkan baris berstatus `draft`.
  - **Finalisasi Draft**: `finalizePlacementRecord` mengubah seluruh draft pada tahun ajaran terpilih menjadi `final`.
  - Migration `0043_placement.sql` menambahkan kolom `student_enrollments.placement_status` (`draft`/`final`, default `final`) beserta check constraint dan index.
- **WhatsApp Gateway & Otomasi Kuitansi (Issue WhatsApp Gateway)**: Otomasi pengiriman tagihan, kuitansi digital, dan bot cek tagihan via WhatsApp:
  - Migrasi database `0055_whatsapp_gateway.sql`: tabel `whatsapp_settings`, `whatsapp_logs`, `receipt_access_tokens`, trigger `set_updated_at`, RLS policies, dan grant ke role `admin_sekolah` serta `bendahara`.
  - Permission baru: `finance.whatsapp_view` dan `finance.whatsapp_manage` di `src/lib/rbac.ts`.
  - Menu baru "WhatsApp & Notifikasi" di sidebar keuangan (`src/lib/nav.ts`).
  - Feature module `src/features/whatsapp/`: integrasi API Fonnte & Wablas, normalisasi nomor HP Indonesia, substitusi variabel template, serta fallback base URL dan dual phone column (`no_telp_wali` / `telepon_wali`).
  - Halaman kuitansi publik bertoken aman di `/kuitansi/v/[token]` yang dapat dibuka dan dicetak oleh wali murid tanpa perlu autentikasi.
  - Route handler webhook `/api/webhooks/whatsapp/inbound` untuk membalas otomatis perintah `#CEKTAGIHAN` atau `#TAGIHAN` dengan rincian tunggakan dan rekening tujuan.
  - Halaman UI di `/keuangan/pengaturan-wa` untuk konfigurasi token, template pesan, tes kirim WhatsApp, dan pemantauan riwayat log pengiriman.
  - Tombol "Kirim WA" pada pilihan masal invoice di `/keuangan/tagihan-otomatis`.

### Changed (Diubah)
- **Unifikasi Skema Biaya (Issue #127)**: Form pembuatan tagihan manual di `/keuangan` kini merujuk langsung ke Skema Biaya (`fee_structures`) melalui kolom `fee_structure_id` pada tabel `bills` (migrasi `0048_unify_fee_structures.sql`). Dropdown "Jenis Tagihan" pada dialog tagihan manual diganti dengan "Skema Biaya" yang auto-fill nominal dan deskripsi. Kolom `bill_item_id` pada `bills` tetap ada (nullable) untuk backward compatibility data historis.

### Removed (Dihapus)
- **Jenis Tagihan (Issue #127)**: Halaman `/keuangan/jenis-tagihan` (beserta `jenis-tagihan-client.tsx`, `actions.ts`, `_components/bill-item-form-dialog.tsx`, `_components/bill-item-delete-dialog.tsx`) dihapus. Menu sidebar "Jenis Tagihan" dan permission `finance.bill_item_view` / `finance.bill_item_manage` di-`rbac.ts` dihapus. Redirect `301` dari `/keuangan/jenis-tagihan` → `/keuangan/skema-biaya` ditambahkan di `next.config.ts`. Schema `saveBillItemSchema`, `readSaveBillItemInput`, dan service `saveBillItemRecord`, `deleteBillItemRecord` dihapus dari `src/features/keuangan/`.

### Fixed (Diperbaiki)
- *(Belum ada perbaikan bug yang dicatat)*

---

*(Tambahkan pembaruan di masa mendatang di bawah tag `[Unreleased]` sebelum melakukan deployment/rilis versi)*
