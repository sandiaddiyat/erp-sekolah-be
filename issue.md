# Issue: Redesign Halaman Kelas + Salin Kelas dari Tahun Ajaran Sebelumnya

> **Target pelaksana:** Junior programmer / AI model tingkat dasar.
> **Baca issue ini dari atas ke bawah secara berurutan. Jangan melompat tahap.**
> Semua path file di bawah ini relatif dari root project.

---

## Ringkasan

Dua pekerjaan pada halaman `http://<host>:3000/akademik/kelas`:

1. **Tahap 1 — Redesign:** samakan tampilan halaman Daftar Kelas dengan standar desain halaman `/pegawai` (tabel, pencarian, filter, pagination, form dialog).
2. **Tahap 2 — Fitur baru:** tambahkan tombol **"Salin dari Tahun Ajaran Sebelumnya"** yang menyalin semua kelas dari tahun ajaran sebelumnya ke tahun ajaran yang dipilih.

**Larangan mutlak:**
- ❌ JANGAN mengubah struktur tabel database `classes`, `academic_years`, atau tabel lain.
- ❌ JANGAN membuat migrasi supabase baru (tidak diperlukan untuk issue ini).
- ❌ JANGAN mengubah file di luar daftar "File yang boleh diubah" di bawah.
- ❌ JANGAN menambah dependency/package baru.
- ❌ JANGAN menambah komentar pada kode.

---

## Latar Belakang Teknis (FAKTA — sudah diverifikasi, jangan diteliti ulang)

### Struktur data

Tabel `classes` (lihat `supabase/migrations/0018_akademik.sql` baris 73–85):

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid PK | — |
| `school_id` | uuid NOT NULL | FK schools, wajib diisi dari user yang login |
| `academic_year_id` | uuid NOT NULL | FK academic_years **ON DELETE CASCADE** |
| `grade_id` | uuid NOT NULL | FK grades (tingkat) |
| `major_id` | uuid NULL | FK majors (jurusan) |
| `room_id` | uuid NULL | FK rooms (ruangan) |
| `homeroom_teacher_id` | uuid NULL | FK pegawai (wali kelas) |
| `name` | text NOT NULL | nama kelas, mis. "X IPA 1" |
| `capacity` | integer NULL | kapasitas |

**Penting:**
- TIDAK ADA unique constraint pada `(school_id, academic_year_id, name)` → logika salin HARUS cek duplikat sendiri.
- `grade_id`, `major_id`, `room_id`, `homeroom_teacher_id` tidak terikat tahun ajaran → saat menyalin, kolom-kolom ini **disalin apa adanya**, hanya `academic_year_id` yang diganti.
- Tabel `academic_years` punya kolom: `id, school_id, name, start_date, end_date, status ('draft'|'active'|'closed'), is_active (boolean)`.
- Hanya boleh ada SATU tahun ajaran aktif (dijamin oleh `saveAcademicYearRecord` di service).

### File yang ada sekarang (halaman kelas)

| Peran | Path |
|---|---|
| Server page | `src/app/(app)/akademik/kelas/page.tsx` |
| Client component | `src/app/(app)/akademik/kelas/kelas-client.tsx` |
| Server actions (semua CRUD akademik) | `src/app/(app)/akademik/actions.ts` — `saveClass` (L213), `deleteClass` (L228) |
| Service layer | `src/features/akademik/service.ts` — `saveClassRecord` (L326), `deleteClassRecord` (L363) |
| Zod schema | `src/features/akademik/schema.ts` — `saveClassSchema` (L228) |
| Tipe TS | `src/lib/types.ts` — `Class` (L380), `AcademicYear` (L330) |

**Kondisi halaman kelas sekarang:**
- Daftar kelas berupa `Card` dengan `divide-y` (BUKAN tabel shadcn).
- Pencarian hanya memfilter kolom `name`.
- Tidak ada pagination, filter, sorting, column toggle.
- Form dialog kecil (`sm:max-w-lg`), field: Tahun Ajaran, Tingkat, Nama Kelas, Jurusan, Ruangan, Wali Kelas, Kapasitas (semua `<select>`/`<Input>` polos).
- Notifikasi memakai `toast` (sonner).

### File referensi desain (JANGAN diubah, hanya dibaca & ditiru)

`src/app/(app)/pegawai/pegawai-client.tsx` — ini SUMBER KEBENARAN desain. Bagian yang perlu ditiru:

| Elemen | Lokasi di pegawai-client.tsx | Pola yang ditiru |
|---|---|---|
| Container halaman | L494 | `<div className="space-y-6">` (TANPA `employee-page`, itu class khusus pegawai) |
| Header halaman | L495–500 | Eyebrow: `text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]` — untuk kelas gunakan teks "Akademik". H1: `font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]`. Subjudul: `text-sm text-muted-foreground` |
| Tombol primer | L505 | `h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]` |
| Tombol outline | L514 | `h-9 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]` |
| Banner notifikasi | L535–539 | `<div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">{banner}</div>` — hanya tampil jika `banner` tidak null |
| Card | L541 | `border-[#e2ece5] shadow-[0_3px_7px_#1c443305]` |
| Card header (search + filter + kolom) | L542–636 | CardTitle `text-[#21483b]`, description `text-[#8b9f95]` berisi "{filtered} dari {total} kelas", search input dengan popover chip kolom yang dicari |
| Tombol filter + panel filter | L589–605, 637–768 | Panel: `rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5`, select `h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a]`, tombol reset "Hapus semua filter" `text-[#ad685d]` |
| Column toggle | L606–634 | `DropdownMenu` + `DropdownMenuCheckboxItem` dari array `allColumns`, state `Set<ColumnKey>` |
| Tabel | L769–1040 | Header row `border-b border-[#e5eee8] hover:bg-transparent`; `TableHead` sortable (klik toggle asc/desc) `px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254]` + ikon `ArrowUpIcon`/`ArrowDownIcon`/`ArrowUpDownIcon`; kolom pertama sticky: `sticky left-0 z-20 bg-white shadow-[8px_0_8px_-8px_#1c44331a]`; kolom Aksi sticky kanan `sticky right-0 z-20 ... shadow-[-8px_0_8px_-8px_#1c44331a]`; body row `group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]` (klik baris buka dialog detail); wrapper `<div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>`. tombol aksi icon `size="icon-sm"` ghost, Pencil hover hijau, Trash2 hover `hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]` |
| Pagination | L1043–1092 | "Menampilkan X–Y dari Z", select baris `[5,10,20,30]`, tombol `Sebelumnya`/`Berikutnya` `h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467]`, indikator `X / Y` |
| Form dialog | L1590, 1592–1600, footer L2201–2242 | DialogContent: `max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[870px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0`. **DialogHeader berada DI DALAM `<form>`**. `<form className="flex h-full max-h-[min(92vh,900px)] flex-col">` berisi: DialogHeader (`shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6`), konten scroll `flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`, lalu `<DialogFooter>` yang berisi div `border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px]`. Tombol Batal: `h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]`. Tombol Simpan: `h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]`, label `Menyimpan... / Simpan Perubahan / Simpan Kelas` |
| Label form | `src/features/pegawai/FieldLabel.tsx | Import `FieldLabel` dari situ — prop `required` menampilkan `*` merah, prop `optional` menampilkan "(opsional)" |

### RBAC / Izin

- `PERMISSIONS.academicsView = "academics.view"` dan `PERMISSIONS.academicsManage = "academics.manage"` (`src/lib/rbac.ts` L57–58).
- Halaman kelas sudah memakai: `requirePermission(PERMISSIONS.academicsView)` di page.tsx, dan `canManage` (boolean) dikirim ke client untuk menyembunyikan tombol Tambah/Ubah/Hapus.
- **Tidak perlu permission baru.** Semua mutasi (termasuk salin) memakai `PERMISSIONS.academicsManage`.

### Helper yang sudah ada (WAJIB dipakai ulang)

- `requireAkademikManage()` — `src/app/(app)/akademik/actions.ts` L50–55: guard untuk server action.
- `revalidateAkademik()` — `src/app/(app)/akademik/actions.ts` L36–48: revalidate `/akademik/kelas` dll. Panggil ini setelah salin.
- `guardAction`, `createClient` — sudah diimport di actions.ts.
- Pola bulk-insert: `src/app/(app)/pegawai/import-action.ts` (L32–183) — lihat sebagai contoh bentuk action bulk insert + hasil `{ success, failed, errors[] }`.
- Pola tes service: `src/features/akademik/__tests__/service.test.ts` (QueryMock pattern).

---

## TAHAP 1 — Redesign Halaman Kelas (ikuti standar /pegawai)

### File yang boleh diubah (Tahap 1)

1. `src/app/(app)/akademik/kelas/page.tsx`
2. `src/app/(app)/akademik/kelas/kelas-client.tsx`
3. `src/features/akademik/schema.ts` — **hanya jika** perlu menambah field optional; jangan ubah field yang ada
4. `src/features/akademik/service.ts` — **hanya jika** Tahap 2 menuntut (lihat Tahap 2)
5. `src/features/akademik/__tests__/service.test.ts` — tambah tes untuk logika baru

> Catatan: boleh juga membuat file baru **hanya di dalam folder** `src/app/(app)/akademik/kelas/` (mis. `copy-action.ts`). Selain daftar di atas, jangan sentuh.

### Langkah 1.1 — Perbaiki server page (`kelas/page.tsx`)

Data yang sudah di-fetch di page.tsx saat ini: `classes` (join academic_years, grades, majors, rooms, pegawai), `academic_years`, `grades`, `majors`, `rooms`, `pegawai`. **Semua data ini sudah cukup — tidak perlu query baru untuk Tahap 1.**

Yang perlu diubah di page.tsx:
- Pastikan `classes` di-select dengan `select("*")` setara yang menghasilkan SEMUA kolom `Class` (id, school_id, academic_year_id, grade_id, major_id, room_id, homeroom_teacher_id, name, capacity, created_at, updated_at) plus nama relasi untuk tampilan.
- Kirim ke client: `classes`, `options` (academic_years, grades, majors, rooms, pegawai), `canManage`.
- Hapus state/props yang tidak terpakai setelah redesign (tidak boleh ada unused variable).

### Langkah 1.2 — Bangun ulang `kelas-client.tsx` mengikuti pola pegawai

Susun ulang `KelasClient` dengan struktur seperti `PegawaiClient`. Detail WAJIB:

**a) State yang dibutuhkan:**
```ts
const [query, setQuery] = useState("");
const [formOpen, setFormOpen] = useState(false);
const [editing, setEditing] = useState<Class | null>(null);
const [viewing, setViewing] = useState<Class | null>(null);
const [deleting, setDeleting] = useState<Class | null>(null);
const [banner, setBanner] = useState<string | null>(null);
const [isPending, startTransition] = useTransition();
const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(...);
const [sortColumn, setSortColumn] = useState<ColumnKey>("name");
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [filterYear, setFilterYear] = useState("");      // filter tahun ajaran
const [filterGrade, setFilterGrade] = useState("");    // filter tingkat
const [isFilterOpen, setIsFilterOpen] = useState(false);
```

**b) Definisi kolom** (`ColumnKey` + `allColumns`) — urutan kolom:
```
name ("Nama Kelas"), year ("Tahun Ajaran"), grade ("Tingkat"),
major ("Jurusan"), room ("Ruangan"), homeroom ("Wali Kelas"),
capacity ("Kapasitas")
```
Kolom "Aksi" sticky kanan selalu tampil (tidak masuk allColumns). Sorting: kolom `year` dan `grade` di-sort dari nama relasinya (bukan id). Sort pakai `localeCompare(valA, "id", { numeric: true, sensitivity: "base" })` seperti pegawai.

**c) Pencarian** mencakup: nama kelas, nama tahun ajaran, nama tingkat, nama jurusan, nama ruangan, nama wali kelas. Tampilkan popover "Pencarian mencakup" saat input fokus (chip berisi nama-nama kolom di atas).

**d) Filter panel** berisi 2 select: Tahun Ajaran (dari options.academic_years) dan Tingkat (dari options.grades). Tombol Filter punya badge jumlah filter aktif (`bg-[#d06a5d]`).

**e) Tabel** — ganti Card list dengan shadcn `Table` lengkap (sort, sticky kolom, hover, pagination). Baris diklik → buka dialog detail (read-only, pola `SiswaDetailDialog` / `PegawaiDetailDialog` di pegawai-client.tsx L1249+).

**f) Pagination** — persis pola pegawai (L1043–1092).

**g) Form dialog** — susun ulang `FormDialog`:
- DialogContent + form flex seperti pola pegawai (lihat tabel referensi di atas — struktur `DialogHeader` di dalam `<form>` adalah WAJIB, jika tidak tombol footer akan terpotong).
- Semua select tetap `<select>` polos dengan class `h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10` (nilai `selectClass`).
- Ganti `<label>` manual dengan `FieldLabel` dari `@/features/pegawai/FieldLabel` (required untuk Tahun Ajaran, Tingkat, Nama Kelas; optional untuk lainnya).
- Judul dialog: eyebrow "Data akademik", DialogTitle `text-[23px] font-semibold tracking-[-.055em] text-[#183d32]` dengan `fontFamily: "'Plus Jakarta Sans', sans-serif"`, text "Tambah Kelas"/"Ubah Kelas".
- Footer: DialogFooter + tombol Batal/Simpan dengan class persis pola pegawai. Label submit: `isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Kelas"`.

**h) Notifikasi** — HAPUS `toast.success` dari form. Gunakan hanya:
- `toast.error` untuk error (masih boleh).
- Banner hijau di halaman untuk sukses: form memanggil `onSaved(message)` → `setBanner(message)` di parent, lalu dialog ditutup. (Pola persis `SiswaFormDialog`.)

**i) Delete** — tetap `AlertDialog`, cukup ubah class tombol konfirmasi tetap `bg-destructive text-white hover:bg-destructive/90`. Setelah sukses, set banner juga (agar konsisten).

### Acceptance Criteria Tahap 1

- [ ] Halaman kelas menampilkan tabel shadcn dengan 7 kolom + kolom Aksi sticky kanan, kolom pertama sticky kiri.
- [ ] Klik header kolom mengurutkan asc/desc dengan ikon panah.
- [ ] Search bekerja pada semua kolom yang disebut di (c); popover chip muncul saat fokus.
- [ ] Filter Tahun Ajaran + Tingkat bekerja; badge jumlah filter aktif tampil; tombol reset mengosongkan semua.
- [ ] Pagination dengan pilihan 5/10/20/30 baris dan tombol Sebelumnya/Berikutnya.
- [ ] Klik baris membuka dialog detail; klik ikon pensil membuka form terisi; klik ikon tempat sampah membuka konfirmasi hapus.
- [ ] Form tambah/ubah bisa disimpan; setelah sukses dialog tertutup dan banner hijau muncul di halaman (BUKAN toast sukses).
- [ ] Semua warna/class mengikuti palet pegawai (lihat tabel referensi). Tidak ada warna di luar palet.
- [ ] `npx tsc --noEmit` dan `npx eslint` lulus tanpa error/warning baru.
- [ ] Halaman `/pegawai` dan halaman lain TIDAK berubah (git diff hanya menyentuh file yang diizinkan).

---

## TAHAP 2 — Salin Kelas dari Tahun Ajaran Sebelumnya

### Perilaku yang diinginkan

1. Di header card (sebelah tombol "Tambah Kelas" / di area tombol), tampilkan tombol outline **"Salin dari TA Sebelumnya"** — hanya tampil jika `canManage` true.
2. Saat diklik → buka dialog kecil (`sm:max-w-md`, pola dialog import pegawai `pegawai-client.tsx` L1141–1193):
   - Select **"Tahun Ajaran Tujuan"** — daftar tahun ajaran (default: tahun ajaran dengan `is_active = true`, atau pilihan pertama).
   - Teks penjelasan: "Semua kelas dari tahun ajaran [sebelumnya] akan disalin ke [tujuan]. Kelas yang sudah ada di tahun tujuan (nama + tingkat sama) akan dilewati."
   - Tombol `Batal` dan `Salin Kelas` (disabled saat proses).
3. Server action menyalin, lalu client menampilkan hasil: toast/banner `"X kelas disalin, Y kelas dilewati (sudah ada)."` dan dialog tertutup.
4. "Tahun ajaran sebelumnya" = tahun ajaran dengan `start_date` yang **langsung lebih lama** dari `start_date` tahun tujuan (urutan terdekat, bukan perbedaan 1 tahun kalender).

### Langkah 2.1 — Schema (`src/features/akademik/schema.ts`)

Tambah di bagian bawah file (jangan ubah kode lama):

```ts
export const copyClassesSchema = z.object({
  targetYearId: z.string().uuid("Tahun ajaran tujuan tidak valid."),
});
export type CopyClassesInput = z.infer<typeof copyClassesSchema>;

export function readCopyClassesInput(formData: FormData) {
  const parsed = copyClassesSchema.safeParse({
    targetYearId: String(formData.get("targetYearId") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  return { ok: true as const, command: parsed.data };
}
```
> Ikuti gaya penulisan error/return yang sudah dipakai `readSaveClassInput` di file yang sama — jika polanya berbeda dari contoh di atas, ikuti pola file.

### Langkah 2.2 — Service (`src/features/akademik/service.ts`)

Tambah fungsi `copyClassesFromPreviousYear`. Kontrak (pola `MutationResult` + deps injection seperti `saveClassRecord`):

```ts
export type CopyClassesResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string };
```

Alur logika (urutan WAJIB):

1. Ambil tahun tujuan: `select("id, school_id, start_date").eq("id", targetYearId).eq("school_id", schoolId).single()`. Jika tidak ada → error "Tahun ajaran tujuan tidak ditemukan."
2. Cari tahun sumber: `select("id, name, start_date").eq("school_id", schoolId).lt("start_date", targetYear.start_date).order("start_date", { ascending: false }).limit(1).maybeSingle()`. Jika tidak ada → error "Tidak ada tahun ajaran sebelumnya."
3. Ambil kelas sumber: `select("grade_id, major_id, room_id, homeroom_teacher_id, name, capacity").eq("school_id", schoolId).eq("academic_year_id", sourceYear.id)`. Jika kosong → error `Tidak ada kelas pada tahun ajaran "${sourceYear.name}" untuk disalin.`
4. Ambil kelas tujuan yang sudah ada: `select("name, grade_id").eq("school_id", schoolId).eq("academic_year_id", targetYear.id)`.
5. Filter: baris sumber **dilewati** jika ada baris tujuan dengan `name` sama (case-insensitive, trim) DAN `grade_id` sama.
6. Jika semua terlewati (tidak ada yang bisa disalin) → return `{ ok: true, created: 0, skipped: N }` (BUKAN error) — caller akan menampilkan "0 disalin, N dilewati".
7. Insert sisanya SEKALI: `supabase.from("classes").insert(rows)` dengan `rows: Database["public"]["Tables"]["classes"]["Insert"][]` — tiap baris memuat `school_id, academic_year_id (targetYear.id), grade_id, major_id, room_id, homeroom_teacher_id, name, capacity`. JANGAN sertakan `id`, `created_at`, `updated_at`.
8. Jika insert error → return error string dari `error.message`.
9. Return `{ ok: true, created: rows.length, skipped }`.

### Langkah 2.3 — Server action

Buat file baru `src/app/(app)/akademik/kelas/copy-action.ts`:

```ts
"use server";

// Salin kelas dari tahun ajaran sebelumnya ke tahun tujuan.
// Ikuti struktur import-action.ts milik pegawai:
//   guardAction -> validasi input -> service -> revalidate -> return hasil
import { revalidateAkademik, requireAkademikManage } from "../actions";
import { readCopyClassesInput } from "@/features/akademik/schema";
import { copyClassesFromPreviousYear } from "@/features/akademik/service";
import { createClient } from "@/lib/supabase/server";

export async function copyClassesFromPrevious(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. const guard = await requireAkademikManage();  -> jika error, return { error }
  // 2. const parsed = readCopyClassesInput(formData); -> jika gagal, return { error }
  // 3. const supabase = await createClient();
  // 4. const result = await copyClassesFromPreviousYear({ supabase }, guard.user.profile.school_id ?? "", parsed.command.targetYearId);
  //    -> jika !result.ok, return { error: result.error }
  // 5. revalidateAkademik();
  // 6. return { success: `${result.created} kelas disalin, ${result.skipped} dilewati (sudah ada).` }
}
```
> `FormState` di sini = tipe `{ success?: string; error?: string }` yang sudah dipakai actions.ts akademik (cek import-nya di `src/app/(app)/akademik/actions.ts`). `requireAkademikManage` dan `revalidateAkademik` mungkin tidak diekspor — jika belum diekspor di `actions.ts`, tambahkan kata `export` pada keduanya (perubahan ini diizinkan). JANGAN mengubah isi fungsinya.
> CATATAN: `guard.user.profile.school_id` — cek bentuk objek user pada `requireAkademikManage`/`guardAction` sebelum dipakai; sesuaikan akses school_id dengan yang dipakai `saveClass` di actions.ts (L213–226).

### Langkah 2.4 — UI dialog salin (`kelas-client.tsx`)

- Tambah state: `copyOpen`, `copyTargetYear` (string), `isCopying`.
- Tombol "Salin dari TA Sebelumnya" (variant outline, class tombol outline pegawai, ikon boleh `CopyPlusIcon`/`CopyIcon` dari lucide-react) — hanya jika `canManage`.
- Dialog `sm:max-w-md` dengan: DialogTitle "Salin Kelas dari TA Sebelumnya", Deskripsi, select tahun tujuan (required, default tahun aktif), teks keterangan dinamis (nama tahun sumber & tujuan).
- Submit memakai `useActionState(copyClassesFromPrevious, undefined)` + `useEffect`:
  - `state?.success` → set banner (`setBanner(state.success)`) + toast.success BOLEH di sini atau cukup banner — pilih konsisten dengan Tahap 1 (banner saja) → tutup dialog.
  - `state?.error` → `toast.error(state.error)`, dialog tetap terbuka.
- Dialog ditutup dengan mereset `copyTargetYear`.

### Langkah 2.5 — Tes service

Tambah test case di `src/features/akademik/__tests__/service.test.ts` (ikuti QueryMock pattern yang sudah ada):

1. Tahun tujuan tidak ditemukan → `{ ok: false }` dengan pesan "Tahun ajaran tujuan tidak ditemukan."
2. Tidak ada tahun sebelumnya → `{ ok: false }` dengan pesan mengandung "Tidak ada tahun ajaran sebelumnya".
3. Tahun sumber tidak punya kelas → error "Tidak ada kelas pada tahun ajaran ... untuk disalin."
4. Salin berhasil: 3 kelas sumber, 1 duplikat (nama+tingkat sama di tujuan) → `{ ok: true, created: 2, skipped: 1 }`, dan `insert` dipanggil dengan `academic_year_id` = target, bukan source.
5. Semua duplikat → `{ ok: true, created: 0, skipped: 3 }` tanpa error.

### Acceptance Criteria Tahap 2

- [ ] Tombol "Salin dari TA Sebelumnya" hanya muncul untuk user dengan academicsManage.
- [ ] Dialog salin: pilih tahun tujuan → keterangan menampilkan nama tahun sumber & tujuan.
- [ ] Kelas tersalin dengan `academic_year_id` baru; grade/major/room/homeroom/capacity ter-copy apa adanya.
- [ ] Kelas dengan (nama sama case-insensitive + tingkat sama) di tahun tujuan TIDAK dobel.
- [ ] Hasil ditampilkan: "X kelas disalin, Y dilewati (sudah ada)." via banner.
- [ ] Tabel tahun sumber & tujuan tidak berubah (tidak ada update, hanya insert).
- [ ] Guard permission & school_id berjalan (user sekolah lain tidak bisa menyalin lintas sekolah).
- [ ] Tes baru lulus: `npx vitest run src/features/akademik`.

---

## Checklist Akhir (wajib semua sebelum selesai)

1. `npx tsc --noEmit` → 0 error.
2. `npx eslint "src/app/(app)/akademik" "src/features/akademik"` → 0 error & 0 warning baru.
3. `npx vitest run src/features/akademik` → semua lulus.
4. `git status` → hanya file yang diizinkan yang berubah.
5. Uji manual di browser:
   - `/akademik/kelas` tampil seperti gaya `/pegawai`.
   - Tambah kelas → banner sukses, bukan toast.
   - Ubah kelas → data terisi, tersimpan.
   - Hapus kelas → konfirmasi, terhapus.
   - Salin dari TA sebelumnya → hasil benar, duplikat dilewati.
6. Commit dengan pesan:
   ```
   feat: redesign halaman kelas mengikuti standar pegawai + salin kelas dari tahun ajaran sebelumnya
   ```

---

## Skema Alur Fitur Salin (ringkas)

```
Klik "Salin dari TA Sebelumnya"
  └─ Dialog: pilih Tahun Ajaran Tujuan (default: tahun aktif)
      └─ Submit → server action copyClassesFromPrevious
          ├─ guard: academicsManage
          ├─ validasi targetYearId (zod)
          ├─ service copyClassesFromPreviousYear:
          │    ├─ cari tahun tujuan (by id + school_id)
          │    ├─ cari tahun sumber (start_date < target, terdekat)
          │    ├─ ambil kelas sumber & kelas tujuan
          │    ├─ filter duplikat (name+grade_id, case-insensitive)
          │    └─ insert sisanya (academic_year_id = target)
          ├─ revalidateAkademik()
          └─ return "X kelas disalin, Y dilewati (sudah ada)."
              └─ banner hijau di halaman + dialog tertutup
```
