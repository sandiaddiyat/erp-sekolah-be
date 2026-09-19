# Issue: Redesign Tampilan Halaman SPP & Keuangan

## Ringkasan

Ubah tampilan halaman **SPP & Keuangan** (`http://192.168.1.101:3000/keuangan`) agar
konsisten dengan desain referensi **Template-ERP-Sekolah** (palet hijau khas template).

Referensi:

- Preview: `https://school-erp-login-red-xiq6.bolt.host`
- Source lokal: `D:\Developments\Template\Template-ERP-Sekolah`
  - Markup halaman keuangan: `src/App.tsx` (fungsi `FinancePage`, baris ±285–316)
  - CSS halaman keuangan: `src/index.css` (blok `/* finance management */`, baris ±175–238)

Pekerjaan ini **hanya menyentuh tampilan (UI)**. Logika bisnis, skema database,
server action, tipe data, dan permission/RBAC **tidak boleh diubah**.

---

## File yang Boleh Diubah vs. yang Dilarang

### Boleh diubah (UI saja)

| File | Keterangan |
| --- | --- |
| `src/app/(app)/keuangan/keuangan-client.tsx` | Komponen client utama, seluruh tampilan. |

### JANGAN diubah

| File | Alasan |
| --- | --- |
| `src/app/(app)/keuangan/page.tsx` | Server component — pemuatan data & permission. |
| `src/app/(app)/keuangan/actions.ts` | Server actions — seluruh logika simpan/hapus/verifikasi. |
| `src/lib/types.ts` / `src/lib/database.types.ts` | Tipe data. |
| `src/lib/schema.ts` / service / validasi | Backend. |
| `src/lib/rbac.ts` / `src/lib/auth.ts` | Permission & RBAC. |
| File migrasi / supabase | Skema database. |

**Aturan utama:** jangan ganti nama `action`, jangan ubah struktur `FormData` yang
dikirim ke action, jangan hapus/kembalikan field apa pun, dan jangan ubah pengecekan
`permissions.*`. Cukup ubah markup + className agar tampil seperti template.

---

## Struktur Target (dari template)

Halaman keuangan template tersusun berurutan:

1. **Page heading** — kicker + judul + deskripsi + tombol "Buat Tagihan".
2. **3 kartu statistik** (Total tagihan / Belum lunas / Total tunggakan).
3. **Panel "Jenis Tagihan"** — heading + tombol "Tambah Jenis" + daftar baris.
4. **Panel "Daftar Tagihan"** — heading + kolom pencarian + daftar baris (dengan status pill, tombol Bayar, tombol Hapus).
5. **3 modal** — Tambah Jenis, Buat Tagihan, Catat Pembayaran.

Halaman saat ini **sudah punya semua bagian ini** (hanya styling-nya yang masih pakai
komponen shadcn standar). Jadi tugasnya adalah **memetakan ulang tampilan ke style
template**, bukan membangun fitur baru.

---

## Peta Pemetaan: Kondisi Sekarang → Target

| Bagian | Sekarang (shadcn standar) | Target (template) |
| --- | --- | --- |
| Heading | `<h1>` + `<p>` + `<Button>` default | Kicker "Keuangan" + judul `#183d32` + deskripsi `#82978d` + tombol primary hijau |
| Statistik | 3× `<Card>` shadcn | 3× `.finance-stats article` (border `#e2ece5`, nilai `#183c31`) |
| Panel Jenis Tagihan | `<Card>` + `divide-y` | `.finance-panel` + `.finance-type-row` |
| Panel Daftar Tagihan | `<Card>` + `divide-y` | `.finance-panel` + `.finance-bill-row` + `.finance-bill-status` |
| Tombol Hapus jenis | `<Button variant="outline">` merah | `.finance-delete` (border `#ecd9d5`, teks `#b06c63`) |
| Tombol Bayar | `<Button variant="outline">` | `.secondary-button` (border `#e1ebe4`, teks `#537467`) |
| Modal | `<Dialog>` shadcn | `.finance-modal` (width 650px, radius 17px, header/body/footer terpisah) |

> Catatan: pakai komponen shadcn yang sudah ada di project (`Button`, `Dialog`, `Input`,
> `Card`, dst.) — jangan menyalin HTML mentah template. Yang diubah hanya **className /
> warna / layout**, dengan tetap memakai komponen shadcn agar idiomatik dengan codebase.

---

## Palet Warna & Token (wajib dipakai persis)

### Warna dasar

| Token | Nilai | Penggunaan |
| --- | --- | --- |
| Green utama | `#185743` | Background tombol primary |
| Green hover | `#124936` | Hover tombol primary |
| Green medium | `#2b7254` | Aksen aktif / teks hijau |
| Green aksen | `#4c9a77` | Kicker heading |
| Heading gelap | `#183d32` | Judul halaman |
| Heading panel | `#21483b` | Judul panel (`h2`) |
| Teks utama | `#2b493e` | Nama siswa / jenis tagihan (strong) |
| Teks sekunder | `#7d9389` | Deskripsi baris (span) |
| Teks tersier | `#9aaa9f` | Info kecil (small) |
| Deskripsi heading | `#82978d` | Paragraf bawah judul |
| Deskripsi panel | `#8b9f95` | Paragraf bawah judul panel |
| Border panel | `#e2ece5` | Border kartu/panel |
| Border baris | `#f0f5f1` | Garis antar baris |
| Border heading panel | `#edf2ee` | Garis bawah heading panel |
| Background search | `#fcfdfc` | Background kolom cari |

### Tombol

| Jenis | Border | Teks | Background | Hover |
| --- | --- | --- | --- | --- |
| Primary | `#185743` | `#fff` | `#185743` | bg `#124936` |
| Outline | `#d7e6dc` | `#4b8669` | `#fff` | border `#9bc5a8`, bg `#f4faf5` |
| Secondary | `#e1ebe4` | `#537467` | `#fff` | border `#b8d6c0`, bg `#f4faf5` |
| Delete | `#ecd9d5` | `#b06c63` | `#fff` | border `#dcaea7`, bg `#fff5f3` |

Ukuran: primary `36px`/font `11px`/bold; outline & secondary `32px`/font `10px`/bold;
delete `29px`/font `10px`/bold. Radius tombol `9px` (delete `7px`).

### Status tagihan (mapping wajib)

Status di aplikasi lebih banyak daripada template, petakan sebagai berikut:

| Status di aplikasi | Label tampil | Warna teks | Warna background |
| --- | --- | --- | --- |
| `belum_bayar` | Belum Bayar | `#a4564d` | `#fdeceb` |
| `menunggu_verifikasi` | Menunggu Verifikasi | `#967233` | `#fcf3df` |
| `cicilan` | Cicilan | `#967233` | `#fcf3df` |
| `lunas` | Lunas | `#2b7254` | `#e7f5e9` |
| `batal` | Batal | `#6b7a72` | `#eef1ef` |

Pill: `padding: 5px 8px; border-radius: 6px; font-size: 9px; font-weight: 700; white-space: nowrap;`

---

## Tahapan Implementasi

Kerjakan **berurutan**, satu tahap selesai → commit terpisah, lalu lanjut.

### Tahap 0 — Persiapan & verifikasi referensi

1. Buka `Template/Template-ERP-Sekolah/src/index.css` dan baca blok `/* finance management */`.
2. Buka `Template/Template-ERP-Sekolah/src/App.tsx` fungsi `FinancePage` dan `FinanceModal`.
3. Buka `src/app/(app)/keuangan/keuangan-client.tsx` dan pahami data yang tersedia
   (`bills`, `billItems`, `students`, `payments`, `permissions`).
4. Pastikan `npm run dev` berjalan dan halaman `/keuangan` bisa dibuka untuk membandingkan.

### Tahap 1 — Heading halaman

Ubah blok heading di `keuangan-client.tsx` (bagian awal `return`):

- Tambah **kicker** `Keuangan` dengan style:
  `text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c9a77]`.
- Judul `SPP & Keuangan` pakai:
  `font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]`.
- Deskripsi pakai `text-xs text-[#82978d]`.
- Tombol "Buat Tagihan" (tetap gated `permissions.billCreate`) pakai style primary:
  `h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]`.

### Tahap 2 — 3 kartu statistik

Ganti 3× `<Card>` statistik menjadi 3 kartu dengan style `.finance-stats`:

- Wrapper: `grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-[17px]` (mobile 1 kolom).
- Kartu: `min-h-[92px] rounded-[14px] border border-[#e2ece5] bg-white px-5 py-[17px]`.
- Label: `block text-[11px] font-semibold text-[#789087]`.
- Nilai: `mt-[13px] block font-heading text-[22px] text-[#183c31]`.

Isi kartu (pertahankan logika perhitungan yang sudah ada):

1. **Total tagihan** → `bills.length`.
2. **Belum lunas** → `bills.filter(b => b.status !== "lunas" && b.status !== "batal").length`.
3. **Total tunggakan** → nilai `totalTunggakan` (sudah ada, `formatRupiah(totalTunggakan)`).

### Tahap 3 — Panel "Jenis Tagihan"

Ganti `<Card>` "Jenis Tagihan" menjadi `.finance-panel`:

- Panel: `mb-[23px] rounded-[15px] border border-[#e2ece5] bg-white shadow-[0_3px_7px_#1c443302]`.
- Heading: `flex items-start justify-between gap-[15px] border-b border-[#edf2ee] px-[21px] pb-4 pt-5`.
  - Judul (`h2`): `font-heading text-[15px] tracking-[-0.035em] text-[#21483b]`.
  - Sub-judul: `mt-1.5 text-[11px] text-[#8b9f95]` — tetap `Katalog tagihan: {billItems.length} jenis`.
  - Tombol "Tambah Jenis" (gated `permissions.billCreate`) style outline `h-8`.
- Daftar: `px-[21px] pb-[7px]`.
- Tiap baris: `flex items-center gap-[15px] border-b border-[#f0f5f1] px-[3px] py-[13px] last:border-b-0`
  - Nama: `text-[12px] text-[#2b493e]` (strong).
  - Detail: `mt-1 block text-[10px] text-[#7d9389]` — `formatRupiah(...) • frekuensi`.
  - Tombol hapus: style `.finance-delete` (lihat tabel tombol), tetap panggil `setDeletingItem(item)`.
- Pertahankan `AlertDialog` konfirmasi hapus jenis yang sudah ada.

### Tahap 4 — Panel "Daftar Tagihan"

Ganti `<Card>` "Daftar Tagihan" menjadi `.finance-panel` dengan style sama seperti Tahap 3.

- Heading: judul + sub-judul `{filtered.length} dari {bills.length} tagihan`, lalu kolom cari.
  - Kolom cari style `.search-field`: `h-[35px] w-full sm:w-[270px] rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc]` dengan ikon `#91a49a` dan input `text-[11px] text-[#284a3d]`.
- Daftar: `px-[21px] pb-[7px]`.
- Tiap baris: `flex items-center gap-[15px] border-b border-[#f0f5f1] px-[3px] py-[13px] last:border-b-0` (mobile `flex-wrap`).
  - Main (flex-1): nama `text-[12px] text-[#2b493e]`; deskripsi `mt-1 block text-[10px] text-[#7d9389]`; info `mt-1 block text-[9px] text-[#9aaa9f]` berisi nominal + sisa + jatuh tempo + status pembayaran.
  - **Status pill** pakai mapping tabel di atas.
  - Tombol "Bayar" (gated `permissions.paymentCreate`) style secondary `h-[29px]`, panggil `setPayTarget(item)`.
  - Tombol "Verifikasi" (gated `permissions.verify` dan ada `menunggu`) style secondary `h-[29px]`.
  - Tombol "Hapus" (gated `permissions.billCreate && status !== "lunas"`) style `.finance-delete`.
- Pertahankan logika `filtered`, `sisaTagihan`, `totalTagihanSetelahDiskon`, `paymentByBill`.
- Pertahankan empty-state "Belum ada tagihan" / hasil pencarian kosong.

### Tahap 5 — Modal (3 form)

Ubah tampilan `<DialogContent>` ketiga modal (Tambah Jenis, Buat Tagihan, Catat Pembayaran)
ke style `.finance-modal`:

- Container: `max-w-[650px] overflow-hidden rounded-[17px] border border-[#dbe8df] bg-[#fbfdfb] shadow-[0_24px_70px_#0d322316]`.
- Header: `flex items-start justify-between gap-5 border-b border-[#e5eee8] bg-white px-6 pb-[18px] pt-[22px]`.
  - Judul: `font-heading text-[20px] tracking-[-0.05em] text-[#183d32]`.
  - Deskripsi: `mt-1.5 text-[11px] leading-relaxed text-[#83988e]`.
- Body: `max-h-[60vh] overflow-y-auto px-6 py-[22px]`.
- Footer: `flex items-center justify-end gap-2 border-t border-[#e3ece6] bg-white px-6 py-[14px]`
  - Batal (style cancel/secondary) + Submit (style primary).

Susunan field pakai grid 2 kolom (`grid gap-4 sm:grid-cols-2`), field lebar `sm:col-span-2`.
Field label `text-[10px] font-bold text-[#4c6a5e]`, input/select `h-10 border-[#dfeae3] text-[11px]`.

> **PENTING:** jangan ubah `name` attribute dan struktur `<form action={formAction}>`.
> Semua field hidden/`FormData` (mis. `bill_id`, `student_id`, `nominal`, `metode`,
> `diskon`, `diskon_keterangan`, `jatuh_tempo`, `bukti_url`, `catatan`) harus tetap ada
> dengan `name` yang sama persis.

Detail tiap modal (semua field sudah ada di kode sekarang, hanya restyle):

1. **Tambah Jenis** (`BillItemFormDialog`): Nama Jenis (wide), Nominal, Frekuensi (select).
2. **Buat Tagihan** (`BillFormDialog`): Siswa (select), Jenis Tagihan (select, wide), Deskripsi (wide), Nominal, Diskon, Keterangan Diskon (wide), Jatuh Tempo (wide).
3. **Catat Pembayaran** (`PaymentFormDialog`): box ringkasan `finance-payment-note`
   (bg `#f0f6f1`, teks `#628074`, radius 9px), Nominal Bayar, Metode (select), URL Bukti (wide), Catatan (wide), footnote `Pembayaran berstatus menunggu sampai diverifikasi petugas.`

### Tahap 6 — Responsive & polish

- Mobile (<760px): statistik tetap 3 kartu (boleh menyempit) lalu 1 kolom di <500px;
  heading panel tagihan jadi kolom; kolom cari full width; baris tagihan wrap.
- Pastikan scroll horizontal **tidak** muncul untuk tabel karena ini daftar (bukan tabel).
- Pastikan tombol primary tidak menyusut aneh di mobile.

---

## Definisi Selesai (Definition of Done)

- [ ] Heading, 3 kartu statistik, 2 panel, dan 3 modal tampil sesuai referensi.
- [ ] Semua status tagihan punya warna pill sesuai tabel mapping.
- [ ] Semua aksi (Tambah Jenis, Buat Tagihan, Bayar, Verifikasi, Hapus) tetap berfungsi.
- [ ] Permission gate (`permissions.billCreate` / `paymentCreate` / `verify`) tetap dihormati.
- [ ] Tidak ada perubahan pada `page.tsx`, `actions.ts`, types, schema, atau RBAC.
- [ ] Lolos validasi (lihat di bawah) tanpa error.

## Validasi (jalankan setelah selesai)

```bash
npx eslint --max-warnings 0 "src/app/(app)/keuangan/keuangan-client.tsx"
npx tsc --noEmit
npx vitest run
```

Buka `http://192.168.1.101:3000/keuangan` dan bandingkan visual dengan referensi.
