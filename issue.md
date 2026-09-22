
# Issue: Perbaikan UI Halaman Data Pegawai

**Prioritas:** Medium
**Estimasi:** 3–5 jam
**Target Pelaksana:** Junior Programmer / AI Model

---

## Latar Belakang

Ada 4 perbaikan UI di halaman `/pegawai` yang perlu diselesaikan:

1. Tombol "Tambah Pegawai" dan "Import Excel" posisinya terpisah (tidak dalam satu grup)
2. Gaya tombol "Tambah Pegawai" belum konsisten dengan tombol di halaman Siswa
3. Tampilan popup form pegawai belum mengikuti desain dari template referensi
4. Belum ada fitur upload foto pegawai di tab Informasi Dasar

---

## File yang Terdampak

| File | Perubahan |
|---|---|
| `src/app/(app)/pegawai/pegawai-client.tsx` | Semua 4 perubahan ada di sini |
| `src/app/(app)/pegawai/actions.ts` | Tambah handler upload foto |
| `supabase/migrations/` | Migrasi baru untuk kolom `photo_url` |
| `src/features/pegawai/schema.ts` | Tambah field `photo_url` |
| `src/features/pegawai/service.ts` | Handle `photo_url` saat save |

---

## Referensi Desain

**Tombol standar** (lihat `src/app/(app)/siswa/siswa-client.tsx` baris ~120):
```tsx
<Button
  onClick={openCreate}
  className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
>
  <UserPlusIcon data-icon="inline-start" className="size-4" />
  Tambah Siswa
</Button>
```

**Upload foto standar** (lihat `src/app/(app)/siswa/siswa-client.tsx` baris ~270):
```tsx
<div className="flex items-center gap-4">
  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#cfe6d4] bg-[#f6fbf7] text-[#9bbfa5]">
    {/* preview foto atau icon ImagePlusIcon */}
  </div>
  <div className="min-w-0">
    <p className="text-xs font-bold text-[#2b493e]">Foto Pegawai</p>
    <p className="mt-1 text-[10px] text-[#93a49c]">JPG/PNG/WebP maksimal 2 MB.</p>
    <input ref={photoInputRef} type="file" name="photo" accept="image/*" className="hidden" onChange={handlePhotoChange} />
    <Button type="button" variant="outline" size="sm" className="mt-2 h-8 rounded-[9px] ..." onClick={() => photoInputRef.current?.click()}>
      Upload Foto
    </Button>
  </div>
</div>
```

**Template desain** ada di `D:\Developments\erp-sekolah\Template\Template-ERP-Sekolah\src\App.tsx` — buka dan lihat fungsi `EmployeePage` dan `EmployeeForm` untuk referensi visual.

---

## Tahapan Pengerjaan

### Tahap 1 — Migrasi Database: Tambah Kolom `photo_url`

Tabel `pegawai` (migrasi `0009_pegawai.sql`) belum punya kolom foto. Buat file baru:

**`supabase/migrations/0025_pegawai_photo.sql`**

```sql
-- Tambah kolom photo_url ke tabel pegawai
alter table public.pegawai
  add column if not exists photo_url text;
```

Jalankan di Supabase Dashboard → SQL Editor.

---

### Tahap 2 — Update TypeScript Types

**`src/lib/types.ts`** — cari type `Pegawai` dan tambahkan field baru:

```typescript
// Tambahkan setelah field email:
photo_url: string | null;
```

**`src/lib/database.types.ts`** — cari tabel `pegawai` di dalam `Tables` dan tambahkan di `Row`, `Insert`, dan `Update`:

```typescript
// Row:
photo_url: string | null;

// Insert:
photo_url?: string | null;

// Update:
photo_url?: string | null;
```

---

### Tahap 3 — Update Schema & Service

**`src/features/pegawai/schema.ts`**

Tambahkan field `photo_url` agar lolos validasi Zod. Ikuti pola field opsional yang sudah ada:

```typescript
// Tambahkan di savePegawaiSchema:
photo_url: z.string().url().optional().or(z.literal("")).transform(v => v || null),
```

Pastikan `readSavePegawaiInput` juga membaca `photo_url`:
```typescript
photo_url: formData.get("photo_url") as string ?? "",
```

**`src/features/pegawai/service.ts`**

Di fungsi `savePegawaiRecord`, tambahkan `photo_url` ke payload insert/update:

```typescript
// Di dalam object payload:
photo_url: command.photo_url ?? null,
```

---

### Tahap 4 — Update `actions.ts`: Handle Upload Foto

Foto pegawai perlu diupload ke Supabase Storage sebelum URL-nya disimpan ke database. Ikuti pola yang sudah ada di `src/app/(app)/siswa/actions.ts`.

**`src/app/(app)/pegawai/actions.ts`** — tambahkan logika upload foto di `savePegawai`:

```typescript
// Setelah guard dan sebelum readSavePegawaiInput:
const photoFile = formData.get("photo") as File | null;
let photoUrl: string | null = (formData.get("photo_url") as string) || null;

if (photoFile && photoFile.size > 0) {
  const supabaseForUpload = await createClient();
  const ext = photoFile.name.split(".").pop() ?? "jpg";
  const path = `pegawai/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabaseForUpload.storage
    .from("school-assets")
    .upload(path, photoFile, { upsert: true });

  if (uploadError) return { error: "Gagal mengupload foto." };

  const { data: urlData } = supabaseForUpload.storage
    .from("school-assets")
    .getPublicUrl(path);
  photoUrl = urlData.publicUrl;
}

// Set photo_url ke formData sebelum parsing:
formData.set("photo_url", photoUrl ?? "");
```

> Catatan: Cek nama bucket storage yang dipakai di `src/app/(app)/siswa/actions.ts` dan gunakan bucket yang sama.

---

### Tahap 5 — Update `pegawai-client.tsx`: 4 Perbaikan UI

Buka `src/app/(app)/pegawai/pegawai-client.tsx` dan buat perubahan berikut:

#### 5.1 — Perbaiki Layout Tombol Header (pisah → satu grup)

Cari blok ini (sekitar baris 250):
```tsx
{permissions.create ? (
  <>
    <Button onClick={openCreate}>
      <UserPlusIcon data-icon="inline-start" />
      Tambah Pegawai
    </Button>
    <Button variant="outline" onClick={handleImport}>
      <UploadIcon data-icon="inline-start" />
      Import Excel
    </Button>
  </>
) : null}
```

Ubah menjadi — bungkus dalam `div` flex agar rapat:
```tsx
{permissions.create ? (
  <div className="flex items-center gap-2">
    <Button
      onClick={openCreate}
      className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
    >
      <UserPlusIcon data-icon="inline-start" className="size-4" />
      Tambah Pegawai
    </Button>
    <Button
      variant="outline"
      onClick={handleImport}
      className="h-9 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
    >
      <UploadIcon data-icon="inline-start" className="size-4" />
      Import Excel
    </Button>
  </div>
) : null}
```

#### 5.2 — Gaya Tombol Sudah Termasuk di 5.1

Gaya tombol "Tambah Pegawai" sudah distandardisasi di langkah 5.1 mengikuti `className` dari halaman Siswa.

#### 5.3 — Perbaiki Tampilan Dialog Form

Cari `DialogContent` di fungsi `PegawaiFormDialog` (sekitar baris 520):
```tsx
<DialogContent className="max-h-[92vh] sm:max-w-[870px] overflow-hidden rounded-[17px] ...">
```

Pastikan dialog sudah memiliki:
- `overflow-y-auto` pada konten form agar bisa di-scroll
- `gap-0 p-0` pada `DialogContent` untuk tampilan seperti template
- Header dan footer dengan padding konsisten

Ikuti struktur dialog yang ada di template referensi (`EmployeeForm` di `App.tsx`):
- Header: label kicker kecil + judul besar + deskripsi
- Body: tabs scrollable
- Footer: tombol Batal + Simpan

Bagian header dialog sudah cukup baik. Yang perlu disesuaikan adalah memastikan body dapat di-scroll saat konten panjang — tambahkan `overflow-y-auto` pada `<form>` atau wrapper tabs:

```tsx
<DialogContent className="max-h-[92vh] gap-0 overflow-hidden sm:max-w-[870px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
  <form action={formAction} className="flex flex-col h-full max-h-[92vh]">
    {/* hidden inputs */}
    <div className="px-6 pb-4 pt-6 border-b border-[#e5eee8]">
      {/* DialogHeader */}
    </div>
    <div className="flex-1 overflow-y-auto px-6 py-4">
      {/* Tabs */}
    </div>
    <div className="px-6 py-4 border-t border-[#e5eee8]">
      {/* DialogFooter */}
    </div>
  </form>
</DialogContent>
```

#### 5.4 — Tambah Upload Foto di Tab "Informasi Dasar"

Di dalam `TabsContent value="basic"`, tambahkan blok foto **di atas** grid field identitas. Ikuti persis pola dari `siswa-client.tsx`.

Tambahkan state dan ref di awal `PegawaiFormDialog`:
```tsx
const photoInputRef = useRef<HTMLInputElement>(null);
const [photoPreview, setPhotoPreview] = useState<string | null>(null);
const [photoName, setPhotoName] = useState<string | null>(null);
```

Tambahkan handler:
```tsx
const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (photoPreview) URL.revokeObjectURL(photoPreview);
  setPhotoPreview(URL.createObjectURL(file));
  setPhotoName(file.name);
};
```

Tambahkan hidden input untuk URL foto lama (saat edit):
```tsx
<input type="hidden" name="photo_url" value={editing?.photo_url ?? ""} />
```

Tambahkan blok JSX foto di awal TabsContent "basic":
```tsx
{/* ===== Foto Pegawai ===== */}
<div className="flex items-center gap-4">
  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#cfe6d4] bg-[#f6fbf7] text-[#9bbfa5]">
    {photoPreview ? (
      <img src={photoPreview} alt="Pratinjau foto" className="h-full w-full object-cover" />
    ) : editing?.photo_url ? (
      <img src={editing.photo_url} alt={editing.full_name} className="h-full w-full object-cover" />
    ) : (
      <ImagePlusIcon className="size-6" />
    )}
  </div>
  <div className="min-w-0">
    <p className="text-xs font-bold text-[#2b493e]">Foto Pegawai</p>
    <p className="mt-1 text-[10px] text-[#93a49c]">
      {photoName ? `Dipilih: ${photoName}. ` : ""}JPG/PNG/WebP maksimal 2 MB.
    </p>
    <input
      ref={photoInputRef}
      type="file"
      name="photo"
      accept="image/*"
      className="hidden"
      onChange={handlePhotoChange}
    />
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2 h-8 rounded-[9px] border-[#d7e6dc] bg-white text-[10px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
      onClick={() => photoInputRef.current?.click()}
    >
      Upload Foto
    </Button>
  </div>
</div>
```

Tambahkan import `ImagePlusIcon` dan `useRef` jika belum ada di baris import.

Juga update tampilan avatar di tabel (kolom `name`) agar menampilkan foto jika ada:
```tsx
case "name":
  return (
    <TableCell ...>
      <div className="flex items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[#def1e2] text-[#2b7254]">
          {item.photo_url ? (
            <img src={item.photo_url} alt={item.full_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold">{getInitials(item.full_name ?? "")}</span>
          )}
        </div>
        ...
      </div>
    </TableCell>
  );
```

---

### Tahap 6 — Verifikasi

```bash
npx tsc --noEmit
npm run build
```

Test manual:

| Skenario | Hasil yang Diharapkan |
|---|---|
| Buka `/pegawai` | Tombol "Tambah Pegawai" dan "Import Excel" berdampingan rapat dalam satu grup |
| Gaya tombol "Tambah Pegawai" | Hijau gelap (#185743), shadow, konsisten dengan tombol di halaman Siswa |
| Klik "Tambah Pegawai" | Dialog terbuka, konten bisa di-scroll jika panjang |
| Tab "Informasi Dasar" | Muncul blok upload foto di atas form identitas |
| Pilih foto → klik "Upload Foto" | Preview foto muncul di kotak kiri |
| Simpan pegawai dengan foto | Foto tersimpan, URL tersimpan di `photo_url` |
| Buka edit pegawai yang sudah punya foto | Foto lama tampil di preview |
| Kolom Nama di tabel | Avatar berupa foto jika ada, inisial jika tidak |

---

## Urutan Pengerjaan

1. **Tahap 1** — Jalankan SQL migrasi di Supabase Dashboard
2. **Tahap 2** — Update `types.ts` dan `database.types.ts`
3. **Tahap 3** — Update `schema.ts` dan `service.ts`
4. **Tahap 4** — Update `actions.ts` untuk upload foto
5. **Tahap 5** — Update `pegawai-client.tsx` (4 perbaikan UI)
6. **Tahap 6** — Verifikasi build dan test manual

---

## Catatan Teknis

- Jangan ubah logika bisnis di `service.ts` selain menambahkan `photo_url`
- Nama bucket Supabase Storage: cek di `src/app/(app)/siswa/actions.ts` — gunakan bucket yang sama
- Foto lama tidak perlu dihapus dari storage saat edit (cukup timpa dengan yang baru)
- `useRef` sudah diimport di `siswa-client.tsx` — pastikan juga diimport di `pegawai-client.tsx`
- Tipe `Pegawai` di `src/lib/types.ts` perlu ditambah `photo_url` agar tidak ada TypeScript error di tabel
