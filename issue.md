# Issue: Redesign 7 Halaman (Master, Akademik, Jenjang, Tingkat, Jurusan, Ruangan, Pendaftaran) Mengikuti Standar Desain Halaman Kelas

> **Target pelaksana:** Junior programmer / AI model tingkat dasar.
> **Baca issue ini dari atas ke bawah secara berurutan. Jangan melompat tahap.**
> Semua path file relatif dari root project.

---

## Ringkasan

Samakan tampilan 7 halaman berikut dengan standar desain halaman `/akademik/kelas` (yang sudah mengikuti standar `/pegawai`):

1. `/master` — Master Data
2. `/akademik/tahun-ajaran` — Tahun Ajaran
3. `/akademik/jenjang` — Jenjang Pendidikan
4. `/akademik/tingkat` — Tingkat
5. `/akademik/jurusan` — Jurusan
6. `/akademik/ruangan` — Ruangan
7. `/akademik/pendaftaran` — Pendaftaran Siswa

**Larangan mutlak:**
- ❌ JANGAN menambah fitur **import Excel** atau **unduh/export** di halaman manapun.
- ❌ JANGAN mengubah struktur tabel database atau membuat migrasi supabase baru.
- ❌ JANGAN menambah dependency/package baru.
- ❌ JANGAN menambah komentar pada kode.
- ❌ JANGAN mengubah file di luar daftar "File yang boleh diubah".
- ❌ JANGAN mengubah halaman `/akademik/kelas` dan `/pegawai` (mereka adalah REFERENSI).

---

## Latar Belakang Teknis (FAKTA — sudah diverifikasi, jangan diteliti ulang)

### SUMBER KEBENARAN desain: `src/app/(app)/akademik/kelas/kelas-client.tsx`

Halaman kelas sudah final. Salin pola elemen berikut dari file itu (kelas ditulis ulang pada commit `603b7f9`, jadi isinya adalah standar terbaru):

| Elemen | Pola yang ditiru dari kelas-client.tsx |
|---|---|
| Container halaman | `<div className="space-y-6">` |
| Header halaman | Eyebrow: `text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]` + H1 `font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]` + subjudul `text-sm text-muted-foreground` |
| Tombol primer "Tambah" | `h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]` |
| Banner notifikasi sukses | `<div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">{banner}</div>` — hanya render jika `banner` tidak null |
| Card daftar | `border-[#e2ece5] shadow-[0_3px_7px_#1c443305]`; CardTitle `font-heading text-[#21483b]`; description `text-[#8b9f95]` berisi "{filtered} dari {total} ..." |
| Search input + popover | Input `h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10`; saat fokus tampil popover `rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]` berisi judul "Pencarian mencakup" + chips kolom `rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]` |
| Tombol Filter | Pola dua warna: aktif `border-[#185743] bg-[#185743] text-white hover:bg-[#124636]`, tidak aktif `border-[#e2ece5] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5]`; badge jumlah filter `bg-[#d06a5d]` di pojok kanan atas |
| Tombol Kolom (column toggle) | `DropdownMenu` + `DropdownMenuCheckboxItem` dari array `allColumns`, state `Set<ColumnKey>`, minimal 1 kolom harus tetap tampil |
| Panel filter | `mx-6 mb-5 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5`; label `text-[10px] font-bold text-[#4c6a5e]`; select `h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]`; tombol reset "Hapus semua filter" `text-[#ad685d] hover:bg-[#fdf0ee]` |
| Tabel | `Table` shadcn; header row `border-b border-[#e5eee8] hover:bg-transparent`; `TableHead` sortable `px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254]` + ikon `ArrowUpIcon`/`ArrowDownIcon`/`ArrowUpDownIcon`; kolom pertama sticky kiri `sticky left-0 z-20 bg-white shadow-[8px_0_8px_-8px_#1c44331a]` (sel body `sticky left-0 z-10 ... group-hover:bg-[#f6fbf7]`); kolom Aksi sticky kanan `sticky right-0 z-20 ... shadow-[-8px_0_8px_-8px_#1c44331a]`; body row `group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]` (klik baris → dialog detail); wrapper `<div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>`. Kolom teks panjang: `max-w-[200px]` + `truncate` + `title` |
| Tombol aksi baris | `variant="ghost" size="icon-sm"`; Pencil `hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]`; Trash2 `hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]`; `e.stopPropagation()` agar klik baris tidak ikut terpicu |
| Pagination | "Menampilkan X–Y dari Z", select baris `[5,10,20,30]` (`h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs text-[#284a3d] outline-none focus:border-[#9dc7a8]`), tombol `Sebelumnya`/`Berikutnya` `h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]`, indikator `X / Y` |
| Empty state | Sel tabel `colSpan` penuh, `h-32 ... text-center text-xs text-[#a0afa8]`; bedakan pesan "ada pencarian/filter" vs "belum ada data" |
| Form dialog (WAJIB persis) | `DialogContent` TANPA `flex flex-col`: `max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)]`. Di dalamnya satu `<form className="flex h-full max-h-[min(92vh,900px)] flex-col">` berisi: (1) `DialogHeader` **DI DALAM form** (`shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6`, eyebrow `text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]`, `DialogTitle text-[23px] font-semibold tracking-[-.055em] text-[#183d32]` dengan `style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}`), (2) konten scroll `flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden` + `style={{ scrollbarWidth: "none" }}`, (3) `DialogFooter` `rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[24px]` berisi div `flex w-full justify-end gap-2`. Tombol Batal `h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5]`; tombol Simpan `h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]`, label `isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan X"` |
| Select & label form | Select `h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10`; label pakai `FieldLabel` dari `@/features/pegawai/FieldLabel` (prop `required` → tanda `*` merah, prop `optional` → "(opsional)") |
| Dialog detail | `DialogContent` BOLEH `flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden ...` (berbeda dari form); konten `flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]` + scrollbar hidden; baris detail pakai pola `DetailRow` (dt `text-[10px] font-bold tracking-[.04em] text-[#8b9f95] uppercase`, dd `mt-1 truncate text-xs text-[#2b493e]`) dalam `<dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">` |
| Notifikasi | HAPUS semua `toast.success`. Sukses hanya via banner: form/dialok memanggil `onSaved(message)` → parent `setBanner(message)` + tutup dialog. `toast.error` tetap dipakai untuk error |
| Delete | `AlertDialog` tetap, tombol konfirmasi `bg-destructive text-white hover:bg-destructive/90`; setelah sukses set banner, bukan toast |

**Jebakan yang WAJIB dihindari (sudah pernah terjadi):**
1. `DialogHeader` harus di dalam `<form>`. Jika di luar, tombol footer terpotong.
2. `DialogContent` form TIDAK boleh diberi `flex flex-col`. Hanya dialog detail yang boleh.
3. Jangan pasang `toast.success` DAN banner sekaligus (notif dobel).

### Kondisi 7 halaman saat ini

Semua 7 halaman masih pola LAMA: daftar berupa `Card` + `divide-y` (bukan tabel shadcn), pencarian sederhana, tidak ada sorting/filter panel/column toggle/pagination, form dialog kecil (`sm:max-w-lg`) dengan label polos, notifikasi pakai `toast.success`, tidak ada dialog detail.

| Halaman | Server page | Client | Data yang sudah di-fetch |
|---|---|---|---|
| Master | `src/app/(app)/master/page.tsx` | `master-client.tsx` (438 baris) | Semua entitas master sekaligus via `listMaster` (`data: Record<MasterEntity, MasterRow[]>`), `canManage` (permission `masterManage`) |
| Tahun Ajaran | `src/app/(app)/akademik/tahun-ajaran/page.tsx` | `tahun-ajaran-client.tsx` | `academic_years` lengkap (`AcademicYear[]`), `canManage` |
| Jenjang | `src/app/(app)/akademik/jenjang/page.tsx` | `jenjang-client.tsx` | `education_levels` (`EducationLevel[]`), `canManage` |
| Tingkat | `src/app/(app)/akademik/tingkat/page.tsx` | `tingkat-client.tsx` | `grades` + `education_levels` (untuk select), `canManage` |
| Jurusan | `src/app/(app)/akademik/jurusan/page.tsx` | `jurusan-client.tsx` | `majors` + `education_levels`, `canManage` |
| Ruangan | `src/app/(app)/akademik/ruangan/page.tsx` | `ruangan-client.tsx` | `rooms` (`Room[]`), `canManage` |
| Pendaftaran | `src/app/(app)/akademik/pendaftaran/page.tsx` | `pendaftaran-client.tsx` | `student_enrollments` (join `students(nama_lengkap)`, `classes(name)`, `academic_years(name)`) + `academic_years` + `classes` + `students`, `canManage` |

**Semua data yang dibutuhkan sudah di-fetch di page.tsx masing-masing — tidak perlu query baru.** Satu-satunya perubahan server page yang dibolehkan: mengganti props yang dikirim ke client jika struktur state berubah (mis. mengirim satu objek `options`), tanpa mengubah query.

### Server actions & service (SUDAH ADA, jangan diubah)

- Master: `saveMaster` / `deleteMaster` di `src/app/(app)/master/actions.ts`.
- Akademik: `saveAcademicYear`, `deleteAcademicYear`, `saveEducationLevel`, `deleteEducationLevel`, `saveGrade`, `deleteGrade`, `saveMajor`, `deleteMajor`, `saveRoom`, `deleteRoom`, `saveEnrollment`, `deleteEnrollment` — semua di `src/app/(app)/akademik/actions.ts` dengan kontrak `(_prevState: FormState, formData: FormData) => Promise<FormState>`.
- Service layer & zod schema di `src/features/akademik/service.ts` dan `src/features/akademik/schema.ts` — JANGAN diubah untuk issue ini.
- Semua action sudah pakai `requireAkademikManage()` / guard permission. **Tidak perlu permission baru.**

---

## POLA UMUM (berlaku untuk semua 7 halaman)

Untuk setiap halaman, lakukan transformasi yang sama seperti yang dilakukan pada `kelas-client.tsx`:

1. **State**: `query`, `formOpen`, `editing`, `viewing`, `deleting`, `banner`, `isPending/startTransition`, `visibleColumns: Set<ColumnKey>`, `sortColumn`, `sortDirection`, `page`, `pageSize`, filter khusus halaman (lihat di bawah), `isFilterOpen`, `isSearchFocused`.
2. **Header halaman**: eyebrow + H1 + subjudul (eyebrow text boleh disesuaikan: "Master data" untuk /master, "Akademik" untuk yang lain).
3. **Tombol Tambah** (hanya jika `canManage`) pakai class tombol primer.
4. **Banner** di bawah header.
5. **Card** dengan search popover + tombol Filter + tombol Kolom.
6. **Tabel shadcn** dengan sorting, sticky kolom pertama & kolom Aksi, klik baris → dialog detail, tombol edit/hapus di kolom Aksi.
7. **Pagination** 5/10/20/30.
8. **Form dialog** dengan struktur flex + FieldLabel + footer standar (padding footer `py-[24px]`).
9. **Dialog detail** read-only dengan `DetailRow`.
10. **Hapus `toast.success`**, ganti banner via `onSaved`.
11. Sorting pakai `localeCompare(valA, "id", { numeric: true, sensitivity: "base" })` untuk string.
12. Search di-reset `page` ke 1; filter juga.
13. **TANPA tombol import/unduh.**

---

## TAHAP 1 — `/akademik/tahun-ajaran`

**File yang boleh diubah:** `tahun-ajaran-client.tsx`, `tahun-ajaran/page.tsx` (hanya props).

- **Kolom tabel**: `name` ("Nama Tahun Ajaran"), `status` ("Status" — pill berwarna: active `bg-[#e7f5e9] text-[#2b7254]`, closed `bg-[#e8e8e8] text-[#6b7280]`, draft `bg-[#e8f0fa] text-[#2f6db3]`; pola Badge `rounded-[5px] border-transparent px-[8px] py-[4px] text-[9px] font-bold`), `periode` ("Periode" — `start_date → end_date` format `DD Mon YYYY`, whitespace-nowrap), `is_active` ("Tahun Aktif" — pill dengan titik: `Aktif` `bg-[#e7f5e9] text-[#2b7254]` / `-`).
- **Search**: nama tahun ajaran.
- **Filter panel**: 1 select Status (Semua/Draft/Aktif/Ditutup).
- **Form dialog** field: Nama (required), Tanggal Mulai (required, `type="date"`), Tanggal Selesai (required, `type="date"`), Status (select), checkbox `is_active` — semua field tetap mengirim nama field yang sama seperti sekarang (jangan ubah nama `name=`).
- **Dialog detail**: semua field di atas (read-only).

## TAHAP 2 — `/akademik/jenjang`

**File:** `jenjang-client.tsx`, `jenjang/page.tsx` (hanya props).

- **Kolom**: `code` ("Kode"), `name` ("Nama Jenjang").
- **Search**: kode + nama. **Filter panel**: tidak ada (cukup 0 filter — sembunyikan tombol Filter jika tidak ada filter; ATAU tampilkan panel tanpa select — pilih konsisten: jika tidak ada filter, JANGAN render tombol Filter).
- **Form**: Kode (required), Nama (required).

## TAHAP 3 — `/akademik/tingkat`

**File:** `tingkat-client.tsx`, `tingkat/page.tsx` (hanya props).

- **Kolom**: `name` ("Nama Tingkat"), `jenjang` ("Jenjang" — dari relasi `education_levels`, sortable dari nama jenjang), `sort_order` ("Urutan").
- **Search**: nama tingkat + nama jenjang.
- **Filter panel**: 1 select Jenjang (dari `educationLevels`).
- **Form**: Jenjang (required, select), Nama Tingkat (required), Urutan (number, opsional).

## TAHAP 4 — `/akademik/jurusan`

**File:** `jurusan-client.tsx`, `jurusan/page.tsx` (hanya props).

- **Kolom**: `name` ("Nama Jurusan"), `jenjang` ("Jenjang" — dari relasi, sortable dari nama).
- **Search**: nama jurusan + nama jenjang.
- **Filter panel**: 1 select Jenjang.
- **Form**: Jenjang (required, select), Nama Jurusan (required).

## TAHAP 5 — `/akademik/ruangan`

**File:** `ruangan-client.tsx`, `ruangan/page.tsx` (hanya props).

- **Kolom**: `name` ("Nama Ruangan"), `type` ("Tipe"), `capacity` ("Kapasitas").
- **Search**: nama + tipe.
- **Filter panel**: 1 select Tipe (opsi unik dari data `rooms`, atau statis jika sudah ada daftarnya di schema).
- **Form**: Nama (required), Tipe (opsional), Kapasitas (number, opsional).

## TAHAP 6 — `/akademik/pendaftaran`

**File:** `pendaftaran-client.tsx`, `pendaftaran/page.tsx` (hanya props).

- **Kolom**: `student` ("Nama Siswa" — dari relasi `students`, kolom pertama sticky), `class` ("Kelas"), `year` ("Tahun Ajaran"), `enrollment_date` ("Tanggal Daftar", format `DD Mon YYYY`), `exit_date` ("Tanggal Keluar", `-` jika null), `status` ("Status" — pill: `active` hijau `bg-[#e7f5e9] text-[#2b7254]`, `keluar` merah lembut `bg-[#fdf0ee] text-[#ad685d]`, `pindah` kuning `bg-[#fcf3e3] text-[#a67437]`, `lulus` biru `bg-[#e8f0fa] text-[#2f6db3]`).
- **Search**: nama siswa, nama kelas, nama tahun ajaran, status.
- **Filter panel**: 3 select — Tahun Ajaran, Kelas, Status.
- **Form**: Siswa (required select), Tahun Ajaran (required), Kelas (required), Tanggal Pendaftaran (required, date), Tanggal Keluar (opsional), Status (select: active/keluar/pindah/lulus).
- **Dialog detail**: semua field di atas.

## TAHAP 7 — `/master` (paling kompleks, kerjakan terakhir)

**File:** `master-client.tsx`, `master/page.tsx` (hanya props).

Halaman master punya **selector entitas** (dropdown "Pilih jenis data master") yang harus tetap ada. Semua config field (`ENTITY_CONFIG`) dan fungsi CRUD (`saveMaster`, `deleteMaster`, field `entity` hidden input) **tetap dipakai apa adanya** — hanya tampilannya yang diubah.

- **Eyebrow**: "Master data". Selector entitas dipindah ke dalam CardHeader (di sebelah search, atau di atas CardTitle) dengan class select standar `h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]`.
- **Kolom tabel per entitas** (kolom pertama = `nameColumn`, sticky):
  - `status_kepegawaian`: Nama Status.
  - `jabatan`: Nama Jabatan, Kategori.
  - `golongan`: Kode Golongan, Keterangan.
  - `unit_kerja`: Nama Unit, Unit Induk (nama dari relasi data `unit_kerja` sendiri — cari di `data.unit_kerja` by `parent_unit_id`).
  - `mapel`: Nama Mata Pelajaran, Kode.
  - `jurusan`: Nama Jurusan.
  - `jenis_sertifikasi`: Nama Sertifikasi.
  - `jenis_cuti_izin`: Nama Jenis, Kuota Hari.
  - `tahun_ajaran`: Tahun Ajaran, Semester, Tanggal Mulai, Tanggal Selesai, Status Aktif (pill Aktif/–).
  - Karena kolom beda-beda per entitas, bangun `allColumns` **dinamis dari `ENTITY_CONFIG`**: tambahkan properti `tableColumns: { key: string; label: string }[]` di tiap config (kolom pertama selalu `nameColumn`). `ColumnKey` jadi `string`.
- **Search**: sudah mencakup semua kolom string (logika lama dipertahankan) + popover chips sesuai kolom entitas aktif.
- **Filter panel**: hanya untuk entitas yang punya kolom kategori: `jabatan` (Kategori: fungsional/struktural), `tahun_ajaran` (Semester), `jenis_cuti_izin` (punya kuota / tidak). Entitas lain tidak menampilkan tombol Filter. Ganti entitas = reset filter + query + sorting + pagination.
- **Form dialog**: struktur flex standar; render field dinamis dari `config.fields` seperti sekarang (text/select/date/checkbox), ganti `<Label>` manual dengan `FieldLabel` (`required` sesuai config), select & footer pakai class standar. Checkbox `is_active`/`status_aktif` tetap `Checkbox` shadcn.
- **Dialog detail**: render semua kolom tabel (read-only) via `DetailRow`.
- **Delete**: tetap AlertDialog, teks peringatan lama dipertahankan, sukses → banner.

---

## Urutan Pengerjaan & Verifikasi per Tahap

Kerjakan berurutan TAHAP 1 → 7. Setiap selesai satu tahap WAJIB:

1. `npx tsc --noEmit` → 0 error.
2. `npx eslint "src/app/(app)/akademik" "src/app/(app)/master" "src/features/akademik"` → 0 error/warning baru.
3. Buka halaman di browser, cek: tabel tampil, sort jalan, search jalan, filter jalan (jika ada), pagination jalan, klik baris → detail, tambah/ubah → banner sukses (BUKAN toast), hapus → konfirmasi + banner.

## Checklist Akhir (semua tahap selesai)

1. `npx tsc --noEmit` → 0 error.
2. `npx eslint "src/app/(app)/akademik" "src/app/(app)/master" "src/features/akademik"` → bersih.
3. `npx vitest run src/features/akademik` → semua lulus (tes lama tidak boleh rusak).
4. `git status` → hanya file yang diizinkan yang berubah. Pastikan TIDAK ada perubahan di `kelas-client.tsx`, `pegawai-client.tsx`, `siswa-client.tsx`, `src/features/**` (schema/service), dan folder `supabase/`.
5. Uji manual 7 halaman di browser (tambah, ubah, hapus, cari, filter, sort, pagination, detail).
6. Pastikan TIDAK ADA tombol import Excel / unduh di ketujuh halaman.
7. Commit dengan pesan:
   ```
   feat: redesign halaman master dan akademik mengikuti standar desain halaman kelas
   ```

---

## Skema Alur Redesign (ringkas, sama untuk semua halaman)

```
Halaman lama (Card divide-y + toast)
  └─ Ganti menjadi:
      ├─ Header (eyebrow + H1 + tombol Tambah primer)
      ├─ Banner sukses (dari onSaved, bukan toast)
      └─ Card
          ├─ CardHeader: judul + "{filtered} dari {total}"
          ├─ Search input + popover kolom pencarian
          ├─ Tombol Filter (badge jumlah aktif) → panel filter
          ├─ Tombol Kolom → dropdown checkbox kolom
          ├─ Table shadcn (sort, sticky kiri/kanan, klik baris → detail)
          │    └─ Kolom Aksi: Pencil (edit) + Trash2 (hapus), sticky kanan
          └─ Pagination (5/10/20/30, Sebelumnya/Berikutnya)
      ├─ Form dialog: DialogHeader DALAM <form> + konten scroll + footer py-[24px]
      ├─ Detail dialog: flex flex-col + DetailRow grid
      └─ AlertDialog hapus
```
