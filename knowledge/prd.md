# PRD — ERP Sekolah

> **Versi:** 1.0  
> **Terakhir diperbarui:** 2026-10-01  
> **Status project:** Fondasi lengkap, beberapa modul bisnis sudah aktif, beberapa lagi direncanakan.

---

## 1. Ringkasan Eksekutif

**ERP Sekolah** adalah aplikasi web ERP (*Enterprise Resource Planning*) untuk **sekolah swasta dan pesantren**. Aplikasi ini dirancang **multi-tenant** sejak awal — satu deployment melayani banyak sekolah — dengan sistem **Role-Based Access Control (RBAC)** penuh yang mencakup role dan permission granular.

Tujuan utama:
- Menyediakan platform terpadu untuk pengelolaan data siswa, pegawai, keuangan, akademik, dan operasional sekolah.
- Memungkinkan **pemilik platform (super admin)** mendaftarkan dan mengelola banyak sekolah dalam satu sistem.
- Menjamin **isolasi data antar sekolah** melalui Row Level Security (RLS) di level database.

---

## 2. Tech Stack

| Komponen | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.3.5 |
| **UI Library** | React | 19.2.8 |
| **Bahasa** | TypeScript | 5.9.3 |
| **Styling** | Tailwind CSS v4 + shadcn/ui (Base UI) | v4 |
| **Auth & Database** | Supabase (Postgres + RLS + Auth) | supabase-js 2.116 |
| **SSR Auth** | @supabase/ssr | 0.12.7 |
| **Validasi** | Zod | 4.6.2 |
| **Form** | react-hook-form | 7.89 |
| **Tabel Data** | @tanstack/react-table | 9.2.4 |
| **Rate Limiter** | @upstash/redis | 1.39 |
| **Icons** | lucide-react | 1.45 |
| **Toast** | sonner | 2.0.8 |
| **Theme** | next-themes | 0.4.6 |
| **Excel** | xlsx (SheetJS) | 0.18.5 |
| **Testing** | Vitest + Testing Library + jsdom | vitest 5, RTL 16 |
| **Linting** | ESLint 9 + eslint-config-next | — |

---

## 3. Arsitektur Tingkat Tinggi

### 3.1 Arsitektur Aplikasi

```
┌────────────────────────────────────────────────────────┐
│                    Browser (Client)                     │
│  React 19 + shadcn/ui + Tailwind CSS v4                │
│  Supabase Client (browser) untuk query realtime         │
└───────────────────────┬────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼────────────────────────────────┐
│               Next.js 16 App Router                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ proxy.ts    │  │ Server       │  │ Server        │ │
│  │ (auth gate) │  │ Components   │  │ Actions       │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬────────┘ │
│         │                │                  │          │
│         ▼                ▼                  ▼          │
│  ┌──────────────────────────────────────────────────┐  │
│  │        Supabase Server Client / Admin Client      │  │
│  │        (@supabase/ssr + service_role key)         │  │
│  └──────────────────────┬───────────────────────────┘  │
└─────────────────────────┼──────────────────────────────┘
                          │ Postgres Wire Protocol
┌─────────────────────────▼──────────────────────────────┐
│                  Supabase (Cloud)                       │
│  ┌─────────┐  ┌────────────┐  ┌──────────────────────┐│
│  │ Auth    │  │ Postgres   │  │ Storage              ││
│  │ (GoTrue)│  │ (+ RLS)    │  │ (foto siswa/pegawai) ││
│  └─────────┘  └────────────┘  └──────────────────────┘│
└────────────────────────────────────────────────────────┘
```

### 3.2 Request Lifecycle

1. **Browser** mengirim request.
2. **`proxy.ts`** (Next.js proxy/middleware) melakukan validasi session terhadap Supabase Auth (`supabase.auth.getUser()`). Jika session invalid → redirect ke `/login`. Jika session di-refresh → cookie baru diteruskan.
3. **Page/Server Component** memanggil `getCurrentUser()` yang menjalankan RPC `get_current_user_context` — mengambil profile, school, roles, dan permissions dalam **satu round trip** ke database.
4. **Server Action** dilindungi oleh `guardAction()` yang memeriksa: login aktif, akun tidak di-block, subscription sekolah valid, dan permission terpenuhi.
5. **RLS di Postgres** menjadi lapisan penegakan terakhir — user hanya bisa mengakses data sekolahnya sendiri.

---

## 4. Struktur Proyek

```
erp-sekolah/
├── src/
│   ├── app/
│   │   ├── (auth)/login/             # Halaman login + server action
│   │   ├── (app)/                    # Area terproteksi (butuh login)
│   │   │   ├── dashboard/            # Ringkasan + hak akses user
│   │   │   ├── users/                # CRUD user, assign role
│   │   │   ├── roles/                # CRUD role + matriks permission
│   │   │   ├── sekolah/              # Daftar sekolah (super admin only)
│   │   │   ├── profil-sekolah/       # Edit profil sekolah sendiri
│   │   │   ├── pegawai/              # CRUD pegawai
│   │   │   ├── siswa/                # CRUD siswa
│   │   │   ├── master/               # Master data (wilayah, agama, bank, dll.)
│   │   │   ├── akademik/             # Tahun ajaran, jenjang, tingkat, jurusan,
│   │   │   │   │                     # ruangan, kelas, penempatan siswa
│   │   │   │   ├── tahun-ajaran/
│   │   │   │   ├── jenjang/
│   │   │   │   ├── tingkat/
│   │   │   │   ├── jurusan/
│   │   │   │   ├── ruangan/
│   │   │   │   ├── kelas/
│   │   │   │   └── pendaftaran/      # Penempatan kelas (enrollment)
│   │   │   ├── keuangan/             # SPP, tagihan, pembayaran
│   │   │   │   ├── jenis-tagihan/
│   │   │   │   ├── skema-biaya/
│   │   │   │   ├── tagihan-otomatis/
│   │   │   │   ├── rekonsiliasi/
│   │   │   │   └── diskon/
│   │   │   └── tidak-berhak/         # Halaman akses ditolak
│   │   ├── auth-actions.ts           # Server action logout
│   │   ├── globals.css               # Global styles
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/
│   │   ├── app-shell/                # Sidebar, topbar, menu user
│   │   ├── ui/                       # Komponen shadcn/ui
│   │   ├── data-error.tsx            # Error state component
│   │   ├── pending-activation.tsx    # Akun belum diaktifkan
│   │   ├── setup-notice.tsx          # Notice setup awal
│   │   └── subscription-blocked.tsx  # Sekolah suspend/expired
│   │
│   ├── features/                     # Feature modules (schema + service)
│   │   ├── akademik/                 # schema.ts, service.ts
│   │   ├── billing/                  # schema.ts, service.ts
│   │   ├── discount/                 # schema.ts, service.ts
│   │   ├── fee-structure/            # schema.ts, service.ts
│   │   ├── keuangan/                 # schema.ts, service.ts
│   │   ├── master/                   # schema.ts, service.ts
│   │   ├── payment-v2/               # schema.ts, service.ts
│   │   ├── pegawai/                  # schema.ts, service.ts, FieldLabel.tsx
│   │   ├── roles/                    # schema.ts, service.ts
│   │   ├── schools/                  # schema.ts, service.ts
│   │   ├── siswa/                    # schema.ts, service.ts
│   │   └── users/                    # schema.ts, service.ts
│   │
│   ├── lib/
│   │   ├── auth.ts                   # getCurrentUser, requireUser, requirePermission
│   │   ├── rbac.ts                   # Konstanta permission + helper can()
│   │   ├── nav.ts                    # Konfigurasi menu sidebar
│   │   ├── types.ts                  # TypeScript type definitions
│   │   ├── database.types.ts         # Supabase generated types
│   │   ├── action-guard.ts           # Guard tunggal untuk Server Actions
│   │   ├── school.ts                 # Helper subscription & status
│   │   ├── env.ts                    # Environment variable helpers
│   │   ├── errors.ts                 # Error constants
│   │   ├── password.ts               # Password utilities
│   │   ├── result.ts                 # Result type helper
│   │   ├── slug.ts                   # Slug generation
│   │   ├── utils.ts                  # Utility functions (cn, etc.)
│   │   ├── rate-limit/               # Rate limiter (Upstash Redis)
│   │   ├── supabase/                 # Supabase clients
│   │   │   ├── server.ts             # Server-side client (cookie-based)
│   │   │   ├── admin.ts              # Admin client (service_role key)
│   │   │   ├── proxy.ts              # Proxy/middleware session handler
│   │   │   └── storage.ts            # Storage helper (foto siswa/pegawai)
│   │   └── validations/
│   │       └── sekolah.ts            # Zod schema validasi sekolah
│   │
│   ├── proxy.ts                      # Next.js proxy entry point
│   └── proxy.test.ts                 # Proxy tests
│
├── supabase/
│   ├── bootstrap.sql                 # Setup sekolah + super admin pertama
│   └── migrations/                   # 36 file migration berurutan
│       ├── 0001_init_rbac.sql        # Tabel RBAC dasar
│       ├── 0002_seed_rbac.sql        # Seed permissions + role default
│       ├── 0003_current_user_context.sql
│       ├── 0004_school_subscription.sql
│       ├── 0005_security_hardening.sql
│       ├── 0006–0009                 # Master data + pegawai
│       ├── 0010_siswa.sql            # Tabel students
│       ├── 0011–0017                 # Keuangan + bill items
│       ├── 0018_akademik.sql         # Tabel akademik (classes, enrollments)
│       ├── 0019–0023                 # Fee structures, families, invoices, discounts, payments
│       ├── 0024–0035                 # RLS policies, hardening, foreign keys, profil sekolah
│       └── 0036_siswa_csv_fields.sql # Kolom tambahan CSV siswa
│
├── scripts/
│   ├── setup-db.mjs                  # Auto migration + seed
│   └── generate-template.mjs        # Template generator
│
├── next.config.ts                    # Security headers, CSP, dev origins
├── package.json
├── tsconfig.json
├── vitest.config.mts
├── components.json                   # shadcn/ui config
└── .env.example                      # Template environment variables
```

---

## 5. Model Data (Database Schema)

### 5.1 Diagram Relasi Utama

```
                              ┌──────────────────┐
                              │     schools       │ ← Tenant (multi-tenant root)
                              │  (sekolah/        │
                              │   pesantren)      │
                              └────────┬─────────┘
                    ┌──────────────────┼──────────────────────┐
                    │                  │                      │
              ┌─────▼─────┐    ┌──────▼──────┐      ┌───────▼────────┐
              │ profiles   │    │  students   │      │   pegawai      │
              │ (user app) │    │  (siswa)    │      │   (karyawan)   │
              └─────┬──────┘    └──────┬──────┘      └───────┬────────┘
                    │                  │                      │
              ┌─────▼──────┐    ┌──────▼──────────┐   ┌──────▼───────────┐
              │ user_roles  │    │ student_        │   │ pegawai_jabatan  │
              └─────┬──────┘    │ enrollments     │   │ pegawai_pendidikan│
                    │           └──────┬──────────┘   │ pegawai_sertifikasi│
              ┌─────▼──────┐          │               └──────────────────┘
              │   roles     │    ┌─────▼──────┐
              └─────┬──────┘    │  classes    │──→ grades, majors, rooms
                    │           └─────┬──────┘
              ┌─────▼──────────┐      │
              │role_permissions│      │
              └─────┬──────────┘      │
                    │           ┌─────▼──────────────┐
              ┌─────▼──────┐    │ academic_years     │
              │ permissions │    └────────────────────┘
              └────────────┘

  KEUANGAN:
  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐
  │bill_items│  │  bills   │  │ invoices  │  │  payments    │
  └──────────┘  └──────────┘  └─────┬─────┘  └──────────────┘
                                    │
                              ┌─────▼─────────┐
                              │invoice_details │──→ fee_structures
                              └───────────────┘

  LAINNYA:
  ┌────────────┐  ┌──────────────┐  ┌────────────────┐
  │fee_category│  │discount_types│  │student_discounts│
  └────────────┘  └──────────────┘  └────────────────┘
  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐
  │  families  │  │  guardians   │  │ billing_run_logs│
  └────────────┘  └──────────────┘  └─────────────────┘
```

### 5.2 Tabel Inti

| Tabel | Deskripsi | Tenant-scoped |
|---|---|---|
| `schools` | Data sekolah/pesantren (tenant root) | — (root) |
| `profiles` | User aplikasi (1:1 dengan `auth.users`) | ✅ |
| `roles` | Role per sekolah | ✅ |
| `permissions` | Katalog permission global (`modul.aksi`) | ❌ (global) |
| `role_permissions` | Mapping role → permission | ✅ (via role) |
| `user_roles` | Mapping user → role(s) | ✅ (via role) |
| `students` | Biodata siswa | ✅ |
| `pegawai` | Data karyawan/guru | ✅ |
| `pegawai_jabatan` | Multi-jabatan pegawai | ✅ |
| `pegawai_pendidikan` | Riwayat pendidikan pegawai | ✅ |
| `pegawai_sertifikasi` | Sertifikasi pegawai | ✅ |
| `academic_years` | Tahun ajaran | ✅ |
| `education_levels` | Jenjang pendidikan (TK/SD/SMP/SMA) | ✅ |
| `grades` | Tingkat per jenjang | ✅ |
| `majors` | Jurusan (SMA/SMK) | ✅ |
| `rooms` | Ruangan | ✅ |
| `classes` | Rombel per tahun ajaran | ✅ |
| `student_enrollments` | Penempatan siswa ke kelas | ✅ |
| `bill_items` | Jenis tagihan (SPP, uang bangunan, dll.) | ✅ |
| `bills` | Tagihan individual per siswa (legacy) | ✅ |
| `fee_categories` | Kategori biaya | ✅ |
| `fee_structures` | Skema biaya per jenjang/tingkat/tahun ajaran | ✅ |
| `families` | Data keluarga siswa | ✅ |
| `guardians` | Wali/orang tua siswa | ✅ |
| `invoices` | Invoice tagihan otomatis | ✅ |
| `invoice_details` | Detail per item invoice | ✅ |
| `payments` | Pembayaran (bill/invoice) | ✅ |
| `discount_types` | Jenis diskon/beasiswa | ✅ |
| `student_discounts` | Diskon per siswa | ✅ |
| `billing_run_logs` | Log jalannya billing otomatis | ✅ |
| `payment_methods` | Metode pembayaran | ✅ |
| `bank_accounts` | Akun bank sekolah | ✅ |

### 5.3 Master Data (Global)

| Tabel | Deskripsi |
|---|---|
| `wilayah` | Provinsi, kabupaten, kecamatan, kelurahan |
| `agama` | Daftar agama |
| `bank` | Daftar bank |
| `jenis_dokumen` | Jenis dokumen (wajib unggah) |
| `jenjang_pendidikan` | Referensi jenjang pendidikan |

### 5.4 Master Data (Per Tenant/Sekolah)

| Tabel | Deskripsi |
|---|---|
| `status_kepegawaian` | Status pegawai (PNS, honorer, dll.) |
| `jabatan` | Daftar jabatan (struktural/fungsional) |
| `golongan` | Golongan kepangkatan |
| `unit_kerja` | Unit kerja (hierarki) |
| `mapel` | Mata pelajaran |
| `jurusan` (master) | Jurusan di level master data |
| `jenis_sertifikasi` | Jenis sertifikasi pegawai |
| `jenis_cuti_izin` | Jenis cuti/izin beserta kuota |
| `tahun_ajaran` (master) | Tahun ajaran + semester |

---

## 6. Sistem Autentikasi & Otorisasi

### 6.1 Alur Autentikasi

1. User login di `/login` dengan email + password.
2. **Rate limiter** membatasi 5 kegagalan per 15 menit per email/IP (Upstash Redis di production, memory di dev).
3. Supabase Auth mengembalikan JWT + refresh token, disimpan di cookie HTTP-only.
4. Setiap request melewati `proxy.ts` yang memvalidasi session via `supabase.auth.getUser()`.
5. Session yang di-refresh mendapat cookie baru dari proxy.

### 6.2 Model RBAC

```
schools ──┬─ profiles ── user_roles ──┐
          │                           ├── roles ── role_permissions ── permissions
          └───────────────────────────┘
```

- **Permission** = `modul.aksi` (contoh: `students.create`, `finance.payment_verify`)
- **Role** = kumpulan permissions, milik satu sekolah
- **User** bisa punya banyak role
- **Super admin** = `profiles.is_super_admin = true`, bypass semua permission

### 6.3 Role Default (Auto-created per Sekolah)

| Role | Slug | Akses |
|---|---|---|
| Administrator Sekolah | `admin_sekolah` | Seluruh permission |
| Kepala Sekolah | `kepala_sekolah` | Semua `view` + laporan keuangan |
| Staf Tata Usaha | `staf_tu` | Siswa, guru, kelas, absensi, laporan |
| Bendahara / Keuangan | `bendahara` | Tagihan, pembayaran, verifikasi, laporan |

### 6.4 Katalog Permission Lengkap

| Modul | Permission Slugs |
|---|---|
| `dashboard` | `view` |
| `users` | `view`, `create`, `update`, `delete`, `assign_role` |
| `roles` | `view`, `create`, `update`, `delete` |
| `schools` | `view`, `update` |
| `master` | `view`, `manage` |
| `pegawai` | `view`, `create`, `update`, `delete`, `export`, `import` |
| `students` | `view`, `create`, `update`, `delete`, `export`, `import` |
| `teachers` | `view`, `create`, `update`, `delete` |
| `classes` | `view`, `create`, `update`, `delete` |
| `finance` | `view`, `bill_create`, `payment_create`, `payment_verify`, `report_view`, `bill_item_view`, `bill_item_manage` |
| `fee_structure` | `view`, `manage` |
| `academics` | `view`, `manage`, `attendance_manage`, `grade_manage`, `report_card_publish` |
| `billing` | `view`, `manage` |
| `discount` | `view`, `manage` |
| `reports` | `view` |
| `settings` | `view`, `update` |

### 6.5 Helper Functions (Server-side)

| Function | Lokasi | Deskripsi |
|---|---|---|
| `getCurrentUser()` | `src/lib/auth.ts` | Ambil user + profile + school + roles + permissions (cached per request) |
| `requireUser()` | `src/lib/auth.ts` | Redirect ke `/login` jika belum login |
| `requirePermission(slug)` | `src/lib/auth.ts` | Redirect ke `/tidak-berhak` jika tidak punya permission |
| `requireSuperAdmin()` | `src/lib/auth.ts` | Redirect jika bukan super admin |
| `guardAction({ permission })` | `src/lib/action-guard.ts` | Guard untuk Server Actions (login + blocked + permission) |
| `can(permissions, slug, isSuperAdmin)` | `src/lib/rbac.ts` | Check permission client/server |
| `canAny(permissions, slugs, isSuperAdmin)` | `src/lib/rbac.ts` | Check salah satu dari banyak permission |

### 6.6 Keamanan Database (RLS)

- **Seluruh tabel** menggunakan Row Level Security.
- User hanya melihat data `school_id` milik sendiri.
- Super admin bisa melihat lintas sekolah.
- Helper function di Postgres: `current_school_id()`, `is_super_admin()`, `has_permission()`, `current_access_ok()` — semuanya `SECURITY DEFINER`.
- Trigger `protect_profile_privileges` mencegah user biasa menaikkan privilege sendiri.

---

## 7. Modul-modul Aplikasi

### 7.1 Modul Aktif (Sudah Dibangun)

#### 7.1.1 Dashboard
- Halaman ringkasan setelah login
- Menampilkan informasi hak akses user dan modul yang tersedia

#### 7.1.2 Manajemen User
- **Rute:** `/users`
- **Permission:** `users.*`
- CRUD user: tambah, edit, nonaktifkan, hapus
- Assign/revoke role ke user
- Filter berdasarkan sekolah (untuk super admin)

#### 7.1.3 Manajemen Role & Hak Akses
- **Rute:** `/roles`
- **Permission:** `roles.*`
- CRUD role custom per sekolah
- Matriks permission: centang permission per role
- Role sistem (`is_system = true`) tidak bisa dihapus

#### 7.1.4 Manajemen Sekolah (Super Admin Only)
- **Rute:** `/sekolah`
- Daftar semua sekolah terdaftar
- Daftarkan sekolah baru (+ opsional buat akun admin)
- Atur status: `trial`, `active`, `suspended`
- Atur masa aktif (`active_until`)
- Sekolah tidak bisa dihapus dari UI, hanya suspend

#### 7.1.5 Profil Sekolah
- **Rute:** `/profil-sekolah`
- **Permission:** `schools.update`
- Edit identitas sekolah: nama, NPSN, NIS/NSS/NDS, alamat lengkap, kontak, logo, dinas

#### 7.1.6 Data Pegawai
- **Rute:** `/pegawai`
- **Permission:** `pegawai.*`
- CRUD pegawai: biodata, jabatan, golongan, unit kerja, pendidikan
- Multi-jabatan (struktural/fungsional)
- Riwayat pendidikan multi-baris
- Sertifikasi multi-baris
- Upload foto pegawai (Supabase Storage)
- Export data pegawai (Excel)
- Import data pegawai (Excel)

#### 7.1.7 Data Siswa
- **Rute:** `/siswa`
- **Permission:** `students.*`
- CRUD siswa: biodata lengkap mencakup:
  - Data diri (NIS, NISN, nama, TTL, jenis kelamin, agama, status keluarga, anak ke-)
  - Alamat detail (dusun, RT, RW, desa, kecamatan, kabupaten/kota)
  - Data orang tua (nama & pekerjaan ayah/ibu, alamat orang tua)
  - Data wali (nama, pekerjaan, telepon, alamat wali)
- Upload foto siswa (Supabase Storage)
- Export data siswa (Excel)
- Import data siswa (Excel/CSV)
- Status siswa: `aktif`, `lulus`, `pindah`, `keluar`

#### 7.1.8 Master Data
- **Rute:** `/master`
- **Permission:** `master.*`
- Pengelolaan data referensi:
  - **Global:** Wilayah (hierarki), Agama, Bank, Jenis Dokumen, Jenjang Pendidikan
  - **Per Sekolah:** Status Kepegawaian, Jabatan, Golongan, Unit Kerja, Mata Pelajaran, Jurusan, Jenis Sertifikasi, Jenis Cuti/Izin, Tahun Ajaran

#### 7.1.9 Akademik
- **Rute:** `/akademik/*`
- **Permission:** `academics.*`
- Sub-modul:
  - **Tahun Ajaran** (`/akademik/tahun-ajaran`): CRUD tahun ajaran, status draft/active/closed
  - **Jenjang** (`/akademik/jenjang`): CRUD jenjang pendidikan (TK/SD/SMP/SMA/SMK)
  - **Tingkat** (`/akademik/tingkat`): CRUD tingkat per jenjang
  - **Jurusan** (`/akademik/jurusan`): CRUD jurusan per jenjang
  - **Ruangan** (`/akademik/ruangan`): CRUD ruangan (tipe, kapasitas)
  - **Kelas** (`/akademik/kelas`): Rombongan belajar per tahun ajaran, wali kelas
  - **Penempatan Kelas** (`/akademik/pendaftaran`): Enrollment siswa ke kelas per tahun ajaran

#### 7.1.10 Keuangan — SPP & Tagihan Manual
- **Rute:** `/keuangan`
- **Permission:** `finance.*`
- Jenis tagihan (bill items): nama, nominal, frekuensi (sekali/bulanan/tahunan)
- Tagihan per siswa (bills): nominal, diskon, jatuh tempo
- Pembayaran (payments): nominal, metode, bukti, verifikasi
- Status tagihan: `belum_bayar`, `menunggu_verifikasi`, `cicilan`, `lunas`, `batal`
- Status pembayaran: `menunggu`, `terverifikasi`, `ditolak`

#### 7.1.11 Keuangan — Skema Biaya
- **Rute:** `/keuangan/skema-biaya`
- **Permission:** `fee_structure.*`
- Definisi biaya per kombinasi tahun ajaran + jenjang + tingkat + jurusan
- Kategori biaya: bulanan, semester, tahunan, sekali bayar
- Tanggal jatuh tempo per item

#### 7.1.12 Keuangan — Tagihan Otomatis (Billing)
- **Rute:** `/keuangan/tagihan-otomatis`
- **Permission:** `billing.*`
- Generate invoice otomatis berdasarkan skema biaya + enrollment siswa
- Log billing run: status berjalan/selesai/gagal, jumlah invoice
- Invoice → Invoice Details → Fee Structures

#### 7.1.13 Keuangan — Rekonsiliasi
- **Rute:** `/keuangan/rekonsiliasi`
- **Permission:** `billing.*`
- Rekonsiliasi pembayaran dengan invoice

#### 7.1.14 Keuangan — Diskon & Beasiswa
- **Rute:** `/keuangan/diskon`
- **Permission:** `discount.*`
- Jenis diskon: persentase atau nominal tetap
- Diskon per siswa dengan periode berlaku
- Alur approval: `pending` → `disetujui`/`ditolak` → `berakhir`
- Approver yang ditunjuk

### 7.2 Modul Direncanakan (Belum Dibangun)

Permission sudah di-seed tapi UI belum dibuat:

| Modul | Permission | Deskripsi |
|---|---|---|
| Absensi | `academics.attendance_manage` | Kehadiran harian siswa |
| Nilai | `academics.grade_manage` | Input nilai per mapel |
| Rapor | `academics.report_card_publish` | Generate & terbitkan rapor |
| Pengaturan | `settings.view`, `settings.update` | Pengaturan aplikasi per sekolah |
| Laporan | `reports.view` | Laporan umum lintas modul |

---

## 8. Navigasi & Sidebar

Menu sidebar dikelompokkan berdasarkan fungsi:

| Grup | Item Menu | Permission/Syarat |
|---|---|---|
| **Beranda** | Dashboard | — (selalu tampil) |
| **Profil Sekolah** | Sekolah | Super admin only |
| | Profil Sekolah | `schools.update` |
| **Manajemen Orang** | Data Pegawai | `pegawai.view` |
| | Data Siswa | `students.view` |
| **Referensi** | Master Data | `master.view` |
| | Akademik (Tahun Ajaran) | `academics.view` |
| | Jenjang | `academics.view` |
| | Tingkat | `academics.view` |
| | Jurusan | `academics.view` |
| | Ruangan | `academics.view` |
| | Kelas | `academics.view` |
| | Penempatan Kelas | `academics.view` |
| **Keuangan** | SPP & Keuangan | `finance.view` |
| | Jenis Tagihan | `finance.bill_item_view` |
| **Tagihan Otomatis** | Skema Biaya | `fee_structure.view` |
| | Tagihan Otomatis | `billing.view` |
| | Rekonsiliasi | `billing.view` |
| **Diskon & Beasiswa** | Diskon & Beasiswa | `discount.view` |
| **Penggunaan & Akses** | User | `users.view` |
| | Role & Hak Akses | `roles.view` |

---

## 9. Multi-Tenancy

### 9.1 Prinsip Dasar

- Setiap sekolah = 1 tenant, diidentifikasi oleh `school_id` (UUID).
- Seluruh tabel data memiliki kolom `school_id` sebagai foreign key ke `schools`.
- RLS Postgres memastikan user hanya bisa mengakses data `school_id` miliknya.
- Super admin bisa melihat dan mengoperasikan data lintas sekolah.

### 9.2 Subscription / Masa Aktif

- **Status sekolah:** `trial` | `active` | `suspended`
- **`active_until`:** tanggal berakhir (null = tanpa batas)
- Jika suspend atau expired → semua user sekolah tersebut hanya melihat halaman pemberitahuan
- Data tetap aman dan bisa diakses kembali setelah diperpanjang

### 9.3 Pendaftaran Sekolah Baru

1. Hanya super admin yang bisa mendaftarkan sekolah baru.
2. Fungsi Postgres `create_school()` memeriksa status super admin **di database**, bukan hanya di UI.
3. Otomatis menjalankan `create_default_roles()` → membuat 4 role bawaan.
4. Opsional: langsung membuat akun admin sekolah.

---

## 10. Pattern & Konvensi Kode

### 10.1 Feature Module Pattern

Setiap fitur ada di `src/features/<nama>/` dengan file:
- **`schema.ts`** — Zod schema untuk validasi form + server action
- **`service.ts`** — Business logic: query database, CRUD operations

### 10.2 Server Action Pattern

```typescript
// 1. Guard — verifikasi login, akun aktif, permission
const guard = await guardAction({ permission: "students.create" });
if ("error" in guard) return { error: guard.error };

// 2. Validasi input — Zod schema
const parsed = studentSchema.safeParse(rawData);
if (!parsed.success) return { error: "Data tidak valid" };

// 3. Operasi database — via Supabase client
const supabase = await createClient();
const { error } = await supabase.from("students").insert(parsed.data);

// 4. Return result
if (error) return { error: error.message };
return { success: "Siswa berhasil ditambahkan" };
```

### 10.3 Page Pattern (Protected Routes)

```typescript
export default async function SiswaPage() {
  // 1. Check permission (redirect if denied)
  const user = await requirePermission(PERMISSIONS.studentsView);
  
  // 2. Fetch data
  const students = await getStudents(user);
  
  // 3. Render
  return <StudentTable data={students} user={user} />;
}
```

### 10.4 Konvensi Penamaan

| Konteks | Konvensi | Contoh |
|---|---|---|
| Tabel database | snake_case | `student_enrollments` |
| Kolom database | snake_case | `school_id`, `nama_lengkap` |
| TypeScript type | PascalCase | `StudentEnrollment`, `BillItem` |
| Component | PascalCase | `StudentFormDialog` |
| File component | kebab-case | `student-form-dialog.tsx` |
| Permission slug | `modul.aksi` | `students.create` |
| Route | kebab-case | `/akademik/tahun-ajaran` |
| Feature folder | kebab-case | `fee-structure`, `payment-v2` |
| Environment var | UPPER_SNAKE | `SUPABASE_SERVICE_ROLE_KEY` |

### 10.5 Menambah Modul Baru (Checklist)

1. ✅ Tambahkan permission di migration SQL baru (atau `0002_seed_rbac.sql`)
2. ✅ Tambahkan slug di `src/lib/rbac.ts` → `PERMISSIONS`
3. ✅ Tambahkan label modul di `MODULE_LABELS` dan urutan di `MODULE_ORDER`
4. ✅ Buat halaman di `src/app/(app)/<modul>/` dan panggil `requirePermission(...)`
5. ✅ Tambahkan item menu di `src/lib/nav.ts` → `MAIN_NAV`
6. ✅ Buat feature module di `src/features/<modul>/` (schema.ts + service.ts)
7. ✅ Buat policy RLS untuk tabel baru di migration
8. ✅ Tambahkan TypeScript types di `src/lib/types.ts`

---

## 11. Environment Variables

| Variable | Wajib | Deskripsi |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon/public key (aman di browser, dilindungi RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (**server-only, RAHASIA**) |
| `UPSTASH_REDIS_REST_URL` | Prod | URL Upstash Redis REST (rate limiter) |
| `UPSTASH_REDIS_REST_TOKEN` | Prod | Token Upstash Redis REST (**RAHASIA**) |
| `DATABASE_URL` | Setup | Connection string Postgres (Session pooler) untuk `npm run db:setup` |
| `SEED_ADMIN_EMAIL` | Setup | Email admin pertama |
| `SEED_ADMIN_PASSWORD` | Setup | Password admin pertama |
| `SEED_ADMIN_NAME` | Opsional | Nama admin (default: "Administrator") |
| `SEED_SCHOOL_NAME` | Opsional | Nama sekolah pertama (default: "Sekolah Contoh") |
| `SEED_SCHOOL_SLUG` | Opsional | Slug sekolah pertama |
| `DATABASE_CA_CERT` | Opsional | Path file CA cert untuk TLS |
| `NEXT_PUBLIC_APP_NAME` | Opsional | Nama aplikasi di UI (default: "ERP Sekolah") |

---

## 12. Setup & Development

### 12.1 Prasyarat
- Node.js 20+ (diuji pada v24)
- Akun Supabase (free tier cukup)

### 12.2 Langkah Setup

```bash
# 1. Clone & install
git clone <repo>
cd erp-sekolah
npm install --include=dev

# 2. Isi environment
cp .env.example .env.local
# Edit .env.local dengan kredensial Supabase

# 3. Setup database (auto migration + seed)
npm run db:setup

# 4. Jalankan
npm run dev
```

### 12.3 Perintah Tersedia

| Perintah | Deskripsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build production + typecheck |
| `npm run lint` | ESLint |
| `npm test` | Test suite (Vitest) |
| `npm run test:watch` | Test watch mode |
| `npm start` | Jalankan hasil build |
| `npm run db:setup` | Auto migration + seed database |

---

## 13. Keamanan

### 13.1 Header Keamanan (next.config.ts)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- Content Security Policy (CSP) yang membatasi sumber script, style, image, dan koneksi

### 13.2 Rate Limiter Login

- 5 kegagalan dalam 15 menit → block 15 menit
- Key identifier di-hash (tidak menyimpan email/IP mentah)
- Reservation token untuk mencegah race condition
- Production: Upstash Redis (wajib), Development: memory fallback

### 13.3 Proteksi Privilege Escalation

- Trigger `protect_profile_privileges` mencegah user biasa mengubah `is_super_admin`
- `create_default_roles()` dicabut izin dari role `authenticated`
- Server Actions menggunakan `guardAction()` sebagai lapisan pertama
- RLS sebagai lapisan enforcement terakhir

---

## 14. Performa

### 14.1 Catatan Region

- Project Supabase di region **Tokyo** → 120–300 ms per round trip dari Indonesia.
- Proxy melakukan 1 round trip validasi auth pada setiap navigasi.
- `getCurrentUser()` di-cache per request (React `cache()`).

### 14.2 Optimasi Query

- `get_current_user_context` menggabungkan profile, school, roles, dan permissions dalam **1 RPC call**.
- Composite indexes pada tabel akademik dan keuangan.
- Composite foreign keys untuk konsistensi tenant.

---

## 15. Glosarium

| Istilah | Definisi |
|---|---|
| **Tenant** | Sekolah/pesantren — unit isolasi data terkecil |
| **Super Admin** | Pemilik platform, bisa mengelola semua sekolah |
| **Admin Sekolah** | Administrator di level sekolah, punya semua permission di sekolahnya |
| **RLS** | Row Level Security — mekanisme Postgres untuk membatasi akses baris data |
| **RBAC** | Role-Based Access Control — hak akses berdasarkan role |
| **Proxy** | Next.js middleware yang menangani auth session refresh & validation |
| **Guard** | Fungsi pengecekan akses sebelum menjalankan operasi |
| **Enrollment** | Penempatan siswa ke kelas pada tahun ajaran tertentu |
| **Bill** | Tagihan manual per siswa (legacy) |
| **Invoice** | Tagihan otomatis yang di-generate dari skema biaya |
| **Fee Structure** | Definisi biaya per kombinasi jenjang/tingkat/tahun ajaran |
| **Billing Run** | Proses generate invoice otomatis massal |
| **Rombel** | Rombongan Belajar = Kelas |
