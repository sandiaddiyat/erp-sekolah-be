# Standar Desain — ERP Sekolah

> **Tujuan:** Dokumen ini adalah referensi bagi developer dan AI model agar setiap halaman, form, dialog, dan tabel yang dibuat memiliki tampilan **konsisten** dengan modul yang sudah ada.

---

## 1. Fondasi Teknologi UI

| Komponen | Teknologi | Import Path |
|---|---|---|
| **Primitive** | `@base-ui/react` (shadcn v4) | — |
| **CVA** | `class-variance-authority` | `cva` |
| **Utility** | `cn()` = `clsx` + `tailwind-merge` | `@/lib/utils` |
| **Icons** | `lucide-react` | `lucide-react` |
| **Toast** | `sonner` | `sonner` |
| **Font** | Geist Sans (body) + Plus Jakarta Sans (heading) | CSS variable `--font-heading`, `--font-display` |

### 1.1 Komponen UI Tersedia (`@/components/ui/`)

```
alert-dialog.tsx    avatar.tsx        badge.tsx         button.tsx
card.tsx            checkbox.tsx      dialog.tsx        dropdown-menu.tsx
input.tsx           label.tsx         multi-select.tsx  select.tsx
separator.tsx       sheet.tsx         skeleton.tsx      sonner.tsx
table.tsx           tabs.tsx          textarea.tsx
```

**Aturan:** Selalu gunakan komponen dari `@/components/ui/` — JANGAN buat ulang komponen yang sudah ada.

---

## 2. Palet Warna Kustom

Project ini menggunakan palet hijau-hutan (*forest green*) yang konsisten di seluruh modul. **Jangan** gunakan warna bawaan Tailwind secara langsung (seperti `text-green-600`). Gunakan kode hex dari palet berikut:

### 2.1 Warna Teks

| Token | Hex | Kegunaan |
|---|---|---|
| **Heading utama** | `#183d32` | Judul halaman (h1) |
| **Heading card/section** | `#21483b` | Judul Card, judul seksi |
| **Heading sekunder** | `#24483b` | Sub-heading di dalam form |
| **Body teks** | `#36584a` | Teks input, teks tabel cell |
| **Teks item** | `#2b493e` | Teks label foto, nama siswa di detail |
| **Teks menu/item** | `#284a3d` | Teks di input search |
| **Teks sekunder** | `#537467` | Tombol outline, teks sekunder |
| **Teks tersier** | `#5d7a6e` | Dropdown content text |
| **Kicker/overline** | `#4c9a77` | Kicker di atas h1 (uppercase) |
| **Kicker dialog** | `#4d9775` | Kicker di header dialog |
| **Teks muted** | `#82978d` | Deskripsi di bawah h1 |
| **Teks muted 2** | `#83988e` | Dialog description |
| **Teks muted 3** | `#8b9f95` | Card description, teks pagination |
| **Teks muted 4** | `#93a49c` | Sub-deskripsi, teks opsional |
| **Teks placeholder** | `#a8b7b0` | Placeholder input |
| **Teks empty state** | `#a0afa8` | Teks kosong di tabel |
| **Teks tabel header** | `#6c8279` | Header tabel (th) |
| **Teks sort icon** | `#9aaa9f` | Sort icon non-aktif |
| **Teks sort aktif** | `#2b7254` | Sort icon/text aktif, hover text |

### 2.2 Warna Label & Form

| Token | Hex | Kegunaan |
|---|---|---|
| **Label form** | `#4c6a5e` | FieldLabel teks |
| **Label wajib** | `#d06a5d` | Tanda asterisk merah `*` |
| **Label opsional** | `#98aaa1` | Teks "(opsional)" |

### 2.3 Warna Tombol Primer

| Token | Hex | Kegunaan |
|---|---|---|
| **Primary bg** | `#185743` | Tombol tambah, border primary |
| **Primary hover** | `#124936` | Hover tombol primer |
| **Primary shadow** | `#18574326` | Box-shadow tombol primer |

### 2.4 Warna Tombol Outline/Sekunder

| Token | Hex | Kegunaan |
|---|---|---|
| **Outline border** | `#d7e6dc` | Border tombol outline |
| **Outline text** | `#4b8669` | Text tombol outline |
| **Outline hover border** | `#9bc5a8` | Hover border outline |
| **Outline hover bg** | `#f4faf5` | Hover bg outline |

### 2.5 Warna Border & Background

| Token | Hex | Kegunaan |
|---|---|---|
| **Card border** | `#e2ece5` | Border Card, search input |
| **Input border** | `#dfeae3` | Border input form, select |
| **Input focus border** | `#78ad8a` | Focus state input |
| **Input focus ring** | `#4f9970/10%` | Ring pada focus |
| **Table row border** | `#f0f5f1` | Border antar baris tabel |
| **Table header border** | `#e5eee8` | Border bawah thead |
| **Dialog border** | `#dbe8df` | Ring dialog, search popup |
| **Filter bg** | `#f7fbf8` | Background panel filter |
| **Dialog bg** | `#fbfdfb` | Background dialog form |
| **Card bg** | `#fcfdfc` | Background search input |
| **Row hover** | `#f6fbf7` | Hover baris tabel |
| **Card shadow** | `#1c443305` | Shadow card |
| **Dialog shadow** | `rgb(13 50 35 / 22%)` | Shadow dialog utama |
| **Table sticky shadow** | `#1c44331a` | Shadow kolom sticky |

### 2.6 Warna Status Badge (Siswa)

| Status | Background | Text |
|---|---|---|
| `aktif` | `#e7f5e9` | `#2b7254` |
| `lulus` | `#e8f2f5` | `#3a7591` |
| `pindah` | `#fcf3e3` | `#a67437` |
| `keluar` | `#fdf0ee` | `#ad685d` |

### 2.7 Warna Banner & Alert

| Tipe | Border | Background | Text |
|---|---|---|---|
| **Success** | `#cbe5d0` | `#edf8ef` | `#27704e` |
| **Destructive hover** | `#e8bcb4` | `#fff7f5` | `#ad685d` |
| **Filter badge** | — | `#eef6f0` | `#4b8669` |
| **Filter badge count** | — | `#d06a5d` | `white` |

---

## 3. Tipografi

### 3.1 Heading Halaman

```tsx
{/* Kicker / Overline */}
<span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">
  Manajemen Orang
</span>

{/* H1 */}
<h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">
  Data Siswa
</h1>

{/* Deskripsi */}
<p className="mt-2 text-xs text-[#82978d]">
  Kelola data biodata siswa sekolah.
</p>
```

### 3.2 Heading Card

```tsx
<CardTitle className="font-heading text-[#21483b]">
  Daftar Siswa
</CardTitle>
<CardDescription className="text-[#8b9f95]">
  {filtered.length} dari {siswa.length} siswa
</CardDescription>
```

### 3.3 Sub-heading dalam Form

```tsx
<h3 className="mb-1 mt-4 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
  Alamat Orang Tua
</h3>
<p className="mb-4 text-[10px] text-[#93a49c]">
  Alamat lengkap orang tua siswa.
</p>
```

### 3.4 Dialog Header (Form Modal)

```tsx
<DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
  {/* Kicker */}
  <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
    Data siswa
  </span>
  {/* Title */}
  <DialogTitle 
    className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
  >
    {isEdit ? "Ubah Siswa" : "Tambah Siswa"}
  </DialogTitle>
  {/* Description */}
  <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
    Isi data biodata siswa. ...
  </DialogDescription>
</DialogHeader>
```

---

## 4. Komponen Form

### 4.1 FieldLabel — Label Form Standar

**Lokasi:** `src/features/pegawai/FieldLabel.tsx`

```tsx
import { Label } from "@/components/ui/label";

export function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-[10px] font-bold text-[#4c6a5e]">
      {children}
      {required ? (
        <span className="text-[#d06a5d]">*</span>
      ) : optional ? (
        <span className="text-[9px] font-medium text-[#98aaa1]">
          (opsional)
        </span>
      ) : null}
    </Label>
  );
}
```

**Penggunaan:**
```tsx
<FieldLabel htmlFor="nama_lengkap" required>Nama Lengkap</FieldLabel>
<FieldLabel htmlFor="alamat_dusun">Dusun</FieldLabel>
<FieldLabel htmlFor="agama_id" optional>Agama</FieldLabel>
```

### 4.2 Input Teks — Standar Form

```tsx
<Input
  id="nama_lengkap"
  name="nama_lengkap"
  defaultValue={editing?.nama_lengkap ?? ""}
  placeholder="Contoh: Budi Santoso"
  required
  className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
/>
```

**Spesifikasi Input Form:**
- Height: `h-10` (40px)
- Border radius: `rounded-[9px]`
- Border: `border-[#dfeae3]`
- Background: `bg-white`
- Padding: `px-3`
- Font size: `text-[11px]`
- Text color: `text-[#36584a]`
- Placeholder color: `placeholder:text-[#a8b7b0]`
- Focus border: `focus-visible:border-[#78ad8a]`
- Focus ring: `focus-visible:ring-3 focus-visible:ring-[#4f9970]/10`

### 4.3 Select (Native) — Standar Form

```tsx
<select
  id="jenis_kelamin"
  name="jenis_kelamin"
  defaultValue={editing?.jenis_kelamin ?? ""}
  required
  className="h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
>
  <option value="">- tidak diisi -</option>
  <option value="L">Laki-laki</option>
  <option value="P">Perempuan</option>
</select>
```

> **Catatan:** Untuk form dialog, gunakan `<select>` native daripada shadcn `<Select>` karena lebih ringan di dalam modal dengan banyak field. shadcn `<Select>` dipakai di toolbar/filter saja.

### 4.4 Input Date — Standar Form

```tsx
<Input
  id="tanggal_lahir"
  name="tanggal_lahir"
  type="date"
  defaultValue={editing?.tanggal_lahir ?? ""}
  required
  className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
/>
```

### 4.5 Input Number — Standar Form

```tsx
<Input
  id="anak_ke"
  name="anak_ke"
  type="number"
  min={1}
  defaultValue={editing?.anak_ke ?? ""}
  className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
/>
```

### 4.6 Form Field Wrapper — Standar Layout

```tsx
{/* Satu field */}
<div className="space-y-2">
  <FieldLabel htmlFor="nama_lengkap" required>Nama Lengkap</FieldLabel>
  <Input ... />
</div>

{/* Full-width field (2 kolom) */}
<div className="space-y-2 sm:col-span-2">
  <FieldLabel htmlFor="alamat">Alamat</FieldLabel>
  <Input ... />
</div>
```

### 4.7 Form Grid Layout

```tsx
{/* Grid 2 kolom responsif */}
<div className="mb-6 grid gap-4 sm:grid-cols-2">
  {/* field items ... */}
</div>

{/* Grid 3 kolom (filter panel) */}
<div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* filter items ... */}
</div>
```

---

## 5. Template Halaman CRUD

### 5.1 Struktur File

Setiap modul CRUD mengikuti pola:

```
src/app/(app)/<modul>/
├── page.tsx              # Server Component (data fetching + permission)
├── <modul>-client.tsx    # Client Component (tabel + form + dialog)
├── actions.ts            # Server Actions (save + delete)
├── export-action.ts      # (opsional) Export Excel
└── import-action.ts      # (opsional) Import Excel

src/features/<modul>/
├── schema.ts             # Zod schema + FormData reader
└── service.ts            # Business logic (CRUD operations)
```

### 5.2 Template Page (Server Component)

```tsx
import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Siswa } from "@/lib/types";
import { SiswaClient } from "./siswa-client";

export const metadata = { title: "Data Siswa" };

export default async function SiswaPage() {
  // 1. Check permission
  const current = await requirePermission(PERMISSIONS.studentsView);
  const supabase = await createClient();

  // 2. Fetch data
  const [siswaResult, agamaResult] = await Promise.all([
    supabase.from("students").select("*").order("nama_lengkap"),
    supabase.from("agama").select("id, nama_agama").order("nama_agama"),
  ]);

  // 3. Handle error
  const loadError = siswaResult.error ?? agamaResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data siswa." />;
  }

  // 4. Pass data + permission booleans ke client
  return (
    <SiswaClient
      siswa={(siswaResult.data ?? []) as Siswa[]}
      options={{ agama: agamaResult.data ?? [] }}
      permissions={{
        create: can(current.permissions, PERMISSIONS.studentsCreate, current.isSuperAdmin),
        update: can(current.permissions, PERMISSIONS.studentsUpdate, current.isSuperAdmin),
        delete: can(current.permissions, PERMISSIONS.studentsDelete, current.isSuperAdmin),
        export: can(current.permissions, PERMISSIONS.studentsExport, current.isSuperAdmin),
        import: can(current.permissions, PERMISSIONS.studentsImport, current.isSuperAdmin),
      }}
    />
  );
}
```

### 5.3 Template Actions (Server Action)

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { saveSiswaRecord, deleteSiswaRecord } from "@/features/siswa/service";
import { readSaveSiswaInput } from "@/features/siswa/schema";
import type { FormState } from "@/lib/types";

// Urutan selalu: guard → parse & validasi → service → revalidate

export async function saveSiswa(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Guard dasar (login + akun aktif)
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };

  // 2. Parse input
  const command = readSaveSiswaInput(formData);
  if (!command.ok) return { error: command.error };

  // 3. Guard permission (berdasarkan create/update)
  const isEdit = Boolean(command.command.id);
  const authorize = await guardAction({
    permission: isEdit ? PERMISSIONS.studentsUpdate : PERMISSIONS.studentsCreate,
  });
  if ("error" in authorize) return { error: authorize.error };

  // 4. Service call
  const supabase = await createClient();
  const result = await saveSiswaRecord({ supabase }, authorize.user, command.command);
  if (!result.ok) return { error: result.error };

  // 5. Revalidate
  revalidatePath("/siswa");
  return { success: result.message };
}

export async function deleteSiswa(id: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.studentsDelete,
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteSiswaRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidatePath("/siswa");
  return { success: result.message };
}
```

---

## 6. Template Tabel Data

### 6.1 Struktur Card + Table

```tsx
<Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
  <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <CardTitle className="font-heading text-[#21483b]">
        Daftar Siswa
      </CardTitle>
      <CardDescription className="text-[#8b9f95]">
        {filtered.length} dari {total} siswa
      </CardDescription>
    </div>
    <div className="flex items-center gap-2">
      {/* Search input + Filter button + Column toggle */}
    </div>
  </CardHeader>
  <CardContent className="px-0">
    <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      <Table className="w-full">
        <TableHeader>...</TableHeader>
        <TableBody>...</TableBody>
      </Table>
    </div>
    {/* Pagination */}
  </CardContent>
</Card>
```

### 6.2 Search Input di Toolbar

```tsx
<div className="relative w-full sm:w-64">
  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
  <Input
    value={query}
    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
    placeholder="Cari data siswa..."
    className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
  />
</div>
```

### 6.3 Table Header dengan Sort

```tsx
<TableHead
  onClick={() => handleSort(col.key)}
  className="px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254]"
>
  <div className="flex items-center gap-1.5">
    <span className={isSorted ? "text-[#2b7254]" : ""}>{col.label}</span>
    {isSorted ? (
      sortDirection === "asc" ? (
        <ArrowUpIcon className="size-3.5 text-[#2b7254] shrink-0" />
      ) : (
        <ArrowDownIcon className="size-3.5 text-[#2b7254] shrink-0" />
      )
    ) : (
      <ArrowUpDownIcon className="size-3.5 text-[#9aaa9f] shrink-0" />
    )}
  </div>
</TableHead>
```

### 6.4 Table Row dengan Hover

```tsx
<TableRow
  key={item.id}
  className="group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
  onClick={() => setViewing(item)}
>
  <TableCell className="px-3.5 py-3 ...">
    {/* cell content */}
  </TableCell>
</TableRow>
```

### 6.5 Status Pill / Badge

```tsx
const STATUS_PILL: Record<string, string> = {
  aktif:  "bg-[#e7f5e9] text-[#2b7254]",
  lulus:  "bg-[#e8f2f5] text-[#3a7591]",
  pindah: "bg-[#fcf3e3] text-[#a67437]",
  keluar: "bg-[#fdf0ee] text-[#ad685d]",
};

// Usage:
<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_PILL[item.status]}`}>
  {STATUS_LABEL[item.status]}
</span>
```

### 6.6 Action Buttons (Edit + Delete)

```tsx
<div className="flex items-center justify-end gap-1">
  {permissions.update && (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Ubah"
      className="border border-[#e1ebe4] bg-[#fff] text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
      onClick={(e) => { e.stopPropagation(); openEdit(item); }}
    >
      <PencilIcon className="size-4" />
    </Button>
  )}
  {permissions.delete && (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Hapus"
      className="border border-[#e1ebe4] bg-[#fff] text-[#537467] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
      onClick={(e) => { e.stopPropagation(); setDeleting(item); }}
    >
      <Trash2Icon className="size-4" />
    </Button>
  )}
</div>
```

### 6.7 Pagination

```tsx
<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
  <div className="flex items-center gap-3">
    <span className="text-xs text-[#8b9f95]">
      Menampilkan {rangeStart}–{rangeEnd} dari {total} siswa
    </span>
    <div className="flex items-center gap-1.5">
      <label htmlFor="page-size" className="text-[10px] font-bold text-[#6c8279]">
        Baris
      </label>
      <select
        id="page-size"
        value={pageSize}
        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
        className="h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs text-[#284a3d] outline-none focus:border-[#9dc7a8]"
      >
        {[5, 10, 20, 30].map((size) => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </div>
  </div>
  <div className="flex items-center gap-1.5">
    <Button
      variant="outline" size="sm"
      disabled={safePage <= 1}
      onClick={() => setPage(safePage - 1)}
      className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
    >
      Sebelumnya
    </Button>
    <span className="px-1.5 text-xs font-semibold text-[#537467]">
      {safePage} / {totalPages}
    </span>
    <Button
      variant="outline" size="sm"
      disabled={safePage >= totalPages}
      onClick={() => setPage(safePage + 1)}
      className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
    >
      Berikutnya
    </Button>
  </div>
</div>
```

### 6.8 Empty State

```tsx
<TableRow>
  <TableCell colSpan={columns.length + 1} className="h-32 text-center text-xs text-[#a0afa8]">
    {hasFilters ? (
      <p className="text-sm text-[#a0afa8]">
        Tidak ada data yang cocok dengan pencarian atau filter.
      </p>
    ) : (
      <div className="py-6">
        <p className="text-sm font-medium text-[#3e5c50]">Belum ada data</p>
        <p className="text-sm text-[#a0afa8]">
          {permissions.create
            ? "Tambahkan data pertama untuk mulai."
            : "Hubungi admin sekolah untuk menambahkan data."}
        </p>
      </div>
    )}
  </TableCell>
</TableRow>
```

---

## 7. Template Dialog/Modal

### 7.1 Form Dialog (Besar, dengan Tabs)

```tsx
<Dialog open={open} onOpenChange={handleOpenChange}>
  <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[870px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
    <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
      
      {/* Header (fixed) */}
      <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
        <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
          Data siswa
        </span>
        <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {isEdit ? "Ubah Siswa" : "Tambah Siswa"}
        </DialogTitle>
        <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
          Deskripsi singkat...
        </DialogDescription>
      </DialogHeader>

      {/* Hidden fields */}
      {editing && <input type="hidden" name="id" value={editing.id} />}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        
        {/* Tabs */}
        <Tabs defaultValue="identitas" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-4">
            <TabsTrigger value="identitas">Data Diri</TabsTrigger>
            <TabsTrigger value="alamat">Alamat</TabsTrigger>
            <TabsTrigger value="orangtua">Orang Tua</TabsTrigger>
            <TabsTrigger value="wali">Wali</TabsTrigger>
          </TabsList>

          <TabsContent value="identitas" className="space-y-0">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              {/* form fields ... */}
            </div>
          </TabsContent>
          {/* more tabs... */}
        </Tabs>

      </div>

      {/* Footer (fixed) */}
      <DialogFooter>
        <div className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
          <Button type="button" variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]">
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]">
            {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Siswa"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

### 7.2 Alert Dialog (Konfirmasi Hapus)

```tsx
<AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle>
      <AlertDialogDescription>
        {deleting?.nama_lengkap} akan dihapus permanen dari data siswa sekolah Anda.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Batal</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        disabled={isPending}
        className="bg-destructive text-white hover:bg-destructive/90"
      >
        Hapus
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 7.3 Import Dialog

```tsx
<Dialog open={importOpen} onOpenChange={setImportOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Import Data Siswa</DialogTitle>
      <DialogDescription>
        Unggah file Excel (.xlsx / .xls) untuk import data secara bulk.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-2">
      <Input type="file" accept=".xlsx,.xls" onChange={...} />
      {/* Import result summary */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
      <Button onClick={handleImportSubmit} disabled={!importFile || isPending}>
        Upload &amp; Import
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 8. Template Tombol

### 8.1 Tombol Primer (Tambah Data)

```tsx
<Button
  onClick={openCreate}
  className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
>
  <UserPlusIcon data-icon="inline-start" className="size-4" />
  Tambah Siswa
</Button>
```

### 8.2 Tombol Outline (Import/Export)

```tsx
<Button
  variant="outline"
  className="h-9 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
>
  <UploadIcon data-icon="inline-start" className="size-4" />
  Import Excel
</Button>
```

### 8.3 Tombol Filter (Toggle)

```tsx
{/* Aktif */}
<Button className="relative h-8 gap-1.5 shrink-0 rounded-[8px] border-[#185743] bg-[#185743] px-3 text-[10px] font-bold text-white hover:bg-[#124636]">
  <FilterIcon className="size-3.5" /> Filter
  <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#d06a5d] text-[9px] font-bold text-white">
    {count}
  </span>
</Button>

{/* Non-aktif */}
<Button className="relative h-8 gap-1.5 shrink-0 rounded-[8px] border-[#e2ece5] bg-white px-3 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]">
  <FilterIcon className="size-3.5" /> Filter
</Button>
```

---

## 9. Filter Panel

```tsx
{isFilterOpen && (
  <div className="mx-6 mb-5 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-heading text-[14px] font-semibold tracking-[-.03em] text-[#24483b]">
          Filter Data Siswa
        </p>
        <p className="mt-0.5 text-[10px] text-[#93a49c]">
          Kombinasikan beberapa filter untuk mempersempit hasil.
        </p>
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={resetFilters}
          className="h-7 gap-1.5 rounded-[8px] px-2.5 text-[10px] font-bold text-[#ad685d] hover:bg-[#fdf0ee] hover:text-[#ad685d]">
          <XIcon className="size-3.5" /> Hapus semua filter
        </Button>
      )}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Filter fields — same pattern as form field wrapper */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-[#4c6a5e]">Jenis Kelamin</label>
        <select
          value={filterValue}
          onChange={(e) => { setFilterValue(e.target.value); setPage(1); }}
          className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
        >
          <option value="">Semua</option>
          {/* options */}
        </select>
      </div>
    </div>
  </div>
)}
```

---

## 10. Banner Sukses

```tsx
{banner && (
  <div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">
    {banner}
  </div>
)}
```

---

## 11. Detail Dialog (View)

### 11.1 DetailRow Component

```tsx
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[.04em] text-[#8b9f95]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-xs text-[#2b493e]"
          title={typeof value === "string" ? value : undefined}>
        {value || "-"}
      </dd>
    </div>
  );
}
```

---

## 12. Foto Upload

```tsx
{/* Photo area */}
<div className="mb-6 flex items-center gap-4">
  {/* Preview box */}
  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#cfe6d4] bg-[#f6fbf7] text-[#9bbfa5]">
    {photoPreview ? (
      <img src={photoPreview} alt="Pratinjau" className="h-full w-full object-cover" />
    ) : editing?.photo_url ? (
      <img src={editing.photo_url} alt={editing.nama_lengkap} className="h-full w-full object-cover" />
    ) : (
      <ImagePlusIcon className="size-6" />
    )}
  </div>
  {/* Upload button */}
  <div className="min-w-0">
    <p className="text-xs font-bold text-[#2b493e]">Foto Siswa</p>
    <p className="mt-1 text-[10px] text-[#93a49c]">JPG/PNG/WebP maksimal 2 MB.</p>
    <input ref={photoInputRef} type="file" name="photo" accept="image/*" className="hidden" onChange={handlePhotoChange} />
    <Button type="button" variant="outline" size="sm"
      className="mt-2 h-8 rounded-[9px] border-[#d7e6dc] bg-white text-[10px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
      onClick={() => photoInputRef.current?.click()}>
      Upload Foto
    </Button>
  </div>
</div>
```

---

## 13. State Management di Client Component

### 13.1 State Pattern Standar

```tsx
const [query, setQuery] = useState("");              // Pencarian
const [formOpen, setFormOpen] = useState(false);       // Dialog form open
const [editing, setEditing] = useState<Siswa | null>(null);  // Item yang di-edit
const [viewing, setViewing] = useState<Siswa | null>(null);  // Item yang di-lihat
const [deleting, setDeleting] = useState<Siswa | null>(null);// Item yang akan dihapus
const [banner, setBanner] = useState<string | null>(null);   // Banner sukses
const [isPending, startTransition] = useTransition();         // Loading state

// Sorting
const [sortColumn, setSortColumn] = useState<ColumnKey>("name");
const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

// Pagination
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);

// Column visibility
const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(...);

// Filters
const [filterGender, setFilterGender] = useState("");
const [filterStatus, setFilterStatus] = useState("");
const [isFilterOpen, setIsFilterOpen] = useState(false);
```

### 13.2 Form Action Pattern (React 19)

```tsx
const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
  saveSiswa,
  undefined
);

useEffect(() => {
  if (state?.success) {
    onSaved(state.success);
    onOpenChange(false);
  } else if (state?.error) {
    toast.error(state.error);
  }
}, [state, onOpenChange, onSaved]);
```

---

## 14. Sizing & Spacing Reference

| Elemen | Ukuran |
|---|---|
| **Tinggi input form** | `h-10` (40px) |
| **Tinggi input toolbar** | `h-[35px]` |
| **Tinggi tombol primer** | `h-9` (36px) |
| **Tinggi tombol sekunder** | `h-8` (32px) |
| **Tinggi tombol kecil** | `h-7` (28px) |
| **Border radius tombol** | `rounded-[9px]` |
| **Border radius card** | `rounded-xl` (default dari Card) |
| **Border radius dialog** | `rounded-[17px]` |
| **Border radius filter panel** | `rounded-[12px]` |
| **Border radius foto** | `rounded-[14px]` |
| **Border radius status pill** | `rounded-full` |
| **Font size label** | `text-[10px]` |
| **Font size input** | `text-[11px]` |
| **Font size tombol primer** | `text-[11px]` |
| **Font size tombol sekunder** | `text-[10px]` |
| **Font size kicker** | `text-[10px]` uppercase |
| **Font size tabel header** | `text-[10px]` |
| **Dialog max width (form)** | `sm:max-w-[870px]` |
| **Dialog max width (kecil)** | `sm:max-w-md` |
| **Dialog max height** | `max-h-[min(92vh,900px)]` |
| **Padding dialog body** | `px-7 pt-[22px] pb-[25px]` |
| **Gap grid form** | `gap-4 sm:grid-cols-2` |

---

## 15. Aturan Penting

1. **JANGAN** gunakan warna Tailwind default (`text-green-600`, `bg-blue-500`). Selalu pakai hex dari palet di atas.
2. **JANGAN** buat komponen UI baru jika sudah ada di `@/components/ui/`. Pakai yang ada.
3. **SELALU** gunakan `FieldLabel` untuk label di form (bukan `<label>` polos).
4. **SELALU** gunakan `guardAction()` di setiap Server Action.
5. **SELALU** gunakan `useActionState` (React 19) untuk form submission di dialog.
6. **SELALU** sertakan `toast.error()` untuk error dan `setBanner()` untuk sukses.
7. **SELALU** gunakan `revalidatePath()` setelah mutasi berhasil.
8. **SELALU** bungkus tabel dalam `Card` dengan `CardContent className="px-0"`.
9. **Form dialog besar** menggunakan struktur: fixed header + scrollable body + fixed footer.
10. **Permission** selalu dicek di 3 tempat: page (redirect), client (conditional render), action (guard).
