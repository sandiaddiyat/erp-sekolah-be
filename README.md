# ERP Sekolah

Aplikasi web ERP untuk sekolah swasta dan pesantren. Dirancang **multi-tenant**
(satu aplikasi melayani banyak sekolah) sejak awal, dengan **RBAC penuh**
(role + permission granular).

Tahap saat ini: **fondasi autentikasi dan manajemen user/role**. Modul bisnis
(siswa, SPP, absensi, rapor) menyusul di atas fondasi ini.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Auth & Database | Supabase (Postgres + Row Level Security) |
| Validasi | Zod |

## Prasyarat

- Node.js 20+ (diuji pada v24)
- Akun Supabase (free tier cukup)

## Setup

### 1. Buat project Supabase

1. Daftar di [supabase.com](https://supabase.com) dan buat project baru.
2. Buka **Project Settings → API**, salin tiga nilai:
   - `Project URL`
   - `anon public` key
   - `service_role` key (**rahasia**, jangan pernah dipakai di browser)

### 2. Isi environment

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_NAME=ERP Sekolah
```

### 3. Jalankan SQL

Ada dua cara. **Cara otomatis** (disarankan) — menjalankan seluruh migration
berurutan lalu membuat sekolah + admin pertama:

```bash
npm run db:setup
```

Butuh `DATABASE_URL` (Session pooler) dan `SEED_*` yang sudah terisi di
`.env.local`. Aman dijalankan berulang kali.

**Cara manual** — buka **SQL Editor** di Supabase, buat 1 user di
**Authentication → Users → Add user** (centang *Auto Confirm User*), lalu
jalankan **semua file di `supabase/migrations/` berurutan** (0001, 0002, 0003,
0004, dan seterusnya), terakhir `supabase/bootstrap.sql` setelah mengganti
`v_admin_email` dengan email user tadi.

Langkah terakhir akan membuat sekolah pertama, 4 role default, dan mengangkat
user tersebut menjadi **super admin**.

### 4. Jalankan aplikasi

```bash
npm install --include=dev
npm run dev
```

Buka http://localhost:3000 dan login dengan akun dari langkah 3.

> **Penting:** kalau environment kamu punya `NODE_ENV=production`, npm otomatis
> menghapus devDependencies saat `npm install`. Selalu pakai `--include=dev`,
> atau hapus variabel tersebut dari environment.

## Model hak akses

```
schools ──┬─ profiles ── user_roles ──┐
          │                           ├── roles ── role_permissions ── permissions
          └───────────────────────────┘
```

- **schools** — tenant. Satu baris = satu sekolah/pesantren.
- **profiles** — data user aplikasi, 1:1 dengan `auth.users`.
- **roles** — milik satu sekolah; `is_system = true` berarti role bawaan (tidak bisa dihapus).
- **permissions** — katalog global (`modul.aksi`, mis. `users.create`).
- **role_permissions** — permission apa saja yang dimiliki sebuah role.
- **user_roles** — seorang user bisa punya banyak role.

### Role default (dibuat otomatis per sekolah)

| Role | Akses |
| --- | --- |
| Administrator Sekolah | Seluruh permission |
| Kepala Sekolah | Semua aksi `view` + laporan keuangan |
| Staf Tata Usaha | Siswa, kelas, absensi, laporan |
| Bendahara / Keuangan | Tagihan, pembayaran, verifikasi, laporan |

### Super admin

Kolom `profiles.is_super_admin` menandai pemilik platform. Super admin
membypass seluruh pengecekan permission (lihat fungsi `has_permission`).
Dilindungi trigger `protect_profile_privileges` agar user biasa tidak bisa
menaikkan hak aksesnya sendiri.

### Keamanan

Semua tabel dijaga **Row Level Security**. User hanya bisa melihat data
sekolahnya sendiri. Fungsi helper (`current_school_id`, `is_super_admin`,
`has_permission`) bersifat `SECURITY DEFINER` untuk menghindari rekursi policy.

## Mendaftarkan sekolah baru

Hanya **super admin** (pemilik platform) yang bisa mendaftarkan sekolah.

1. Buka menu **Sekolah** di sidebar.
2. Klik **Daftarkan Sekolah**, isi identitas sekolah, status, dan masa aktif.
3. Centang **Buatkan akun admin sekolah sekarang** untuk sekaligus membuat akun
   admin pertamanya — akun itu otomatis mendapat role *Administrator Sekolah*.

Sekolah baru otomatis mendapat 4 role bawaan. Prosesnya berjalan lewat fungsi
Postgres `create_school()` (`migrations/0004`) yang memeriksa status super admin
**di dalam database**, bukan hanya menyembunyikan tombol di UI.

Fungsi `create_default_roles()` sengaja dicabut izinnya dari role `authenticated`
— ia menerima `school_id` sembarang, sehingga tanpa pembatasan seorang admin
sekolah bisa membuat role default di sekolah orang lain.

### Masa aktif

- Kolom `status`: `trial`, `active`, atau `suspended`.
- Kolom `active_until`: tanggal berakhir. **Kosong berarti tanpa batas.**
- Bila sekolah disuspend atau masa aktifnya lewat, seluruh user di sekolah itu
  melihat halaman pemberitahuan dan tidak bisa memakai aplikasi. Data tetap
  tersimpan dan kembali bisa diakses begitu masa aktif diperbarui.

### Catatan multi-tenant

Karena super admin boleh melihat lintas sekolah, halaman **User** dan **Role**
punya kolom serta filter **Sekolah** supaya data antar sekolah tidak tercampur.
Admin sekolah biasa tidak melihat filter itu — datanya sudah otomatis terbatas
pada sekolahnya sendiri oleh RLS.

Sekolah **tidak bisa dihapus dari UI**, hanya disuspend. Menghapus sekolah akan
mencabut akses banyak orang sekaligus, jadi itu sengaja bukan operasi satu klik.

## Catatan performa

Karena project Supabase berada di region Tokyo, satu round trip dari Indonesia
memakan **~120–300 ms**. Dua keputusan desain berikut menjaga navigasi tetap
ringan (~300 ms per halaman di mode produksi):

- **`getCurrentUser()` hanya satu round trip.** Profil, sekolah, role, dan
  permission diambil sekaligus lewat fungsi Postgres
  `get_current_user_context()` (lihat `migrations/0003`). Sebelumnya butuh 4
  query berurutan, sekitar 650 ms per navigasi.
- **Proxy memakai `auth.getSession()`, bukan `auth.getUser()`.** `getSession()`
  membaca cookie dan hanya menyentuh jaringan saat token memang perlu
  di-refresh, sehingga hemat ~130 ms per request — termasuk pada setiap prefetch
  link.

  Ini **sengaja dan bukan celah keamanan**. Proxy hanya menentukan arah
  redirect, bukan memberi izin. Otorisasi sebenarnya terjadi di server component:
  `getCurrentUser()` mengirim JWT user ke PostgREST, dan Supabase memverifikasi
  tanda tangan serta masa berlaku token sebelum fungsi apa pun dieksekusi.
  Cookie palsu akan ditolak di sana dan user diarahkan ke `/login`.

> Jangan mengganti `getSession()` menjadi `getUser()` di proxy tanpa mengukur
> ulang — itu menambah satu round trip ke Supabase pada tiap request.

## Struktur proyek

```
src/
  app/
    (auth)/login/         halaman login + server action
    (app)/                area terproteksi (butuh login)
      dashboard/          ringkasan + hak akses user
      users/              CRUD user, assign role
      roles/              CRUD role + matriks permission
      tidak-berhak/       halaman akses ditolak
    auth-actions.ts       server action logout
  components/
    app-shell/            sidebar, topbar, menu user
    ui/                   komponen shadcn
  lib/
    auth.ts               getCurrentUser, requireUser, requirePermission
    rbac.ts               konstanta permission + helper can()
    nav.ts                konfigurasi menu (difilter permission)
    supabase/             client browser/server/admin + proxy
  proxy.ts                proteksi route + refresh session (Next 16)
supabase/
  migrations/             skema dan seed
  bootstrap.sql           setup sekolah + super admin pertama
```

## Menambah modul baru

1. Tambahkan permission di `supabase/migrations/0002_seed_rbac.sql` (atau migration baru).
2. Tambahkan slug-nya di `src/lib/rbac.ts` → `PERMISSIONS`.
3. Tambahkan label modul di `MODULE_LABELS` dan urutan di `MODULE_ORDER`.
4. Buat halaman di `src/app/(app)/<modul>/` dan panggil `requirePermission(...)`.
5. Tambahkan item menu di `src/lib/nav.ts` → `MAIN_NAV`.
6. Buat policy RLS untuk tabel baru di migration.

Permission yang sudah tersedia tetapi modulnya belum dibangun: siswa, guru,
kelas, keuangan, akademik, laporan, pengaturan.

## Perintah

```bash
npm run dev      # development
npm run build    # build production + typecheck
npm run lint     # ESLint
npm start        # jalankan hasil build
```
