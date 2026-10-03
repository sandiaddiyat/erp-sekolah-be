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
- **Penempatan Siswa ke Kelas (Issue #104)**: Halaman baru `/akademik/penempatan` untuk menempatkan siswa dengan tiga mode:
  - **Mode Manual**: tempatkan siswa satu per satu; server menolak bila kelas sudah penuh, kelas tidak sesuai tahun ajaran, atau siswa sudah terdaftar.
  - **Mode Semi-otomatis**: `generateDraftPlacement` membagikan siswa yang belum ditempatkan ke kelas secara round-robin dan melewati kelas yang penuh, menghasilkan baris berstatus `draft`.
  - **Finalisasi Draft**: `finalizePlacementRecord` mengubah seluruh draft pada tahun ajaran terpilih menjadi `final`.
  - Migration `0043_placement.sql` menambahkan kolom `student_enrollments.placement_status` (`draft`/`final`, default `final`) beserta check constraint dan index.
  - Validasi dan service baru di `src/features/akademik/` (`savePlacementSchema`, `generateDraftPlacementSchema`, `savePlacementRecord`, `fetchUnplacedStudents`, `generateDraftPlacement`, `finalizePlacementRecord`) dengan Server Actions dilindungi `guardAction()`.

### Changed (Diubah)
- *(Belum ada perubahan kode yang dicatat)*

### Fixed (Diperbaiki)
- *(Belum ada perbaikan bug yang dicatat)*

---

*(Tambahkan pembaruan di masa mendatang di bawah tag `[Unreleased]` sebelum melakukan deployment/rilis versi)*
