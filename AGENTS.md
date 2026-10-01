<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# ERP Sekolah — Agent Guide

## Ringkasan Proyek

Aplikasi web ERP untuk **sekolah swasta dan pesantren**. Multi-tenant (satu
deployment melayani banyak sekolah) dengan RBAC penuh (role + permission
granular). Data diisolasi di level database via Row Level Security (RLS).

| Komponen | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5.9 |
| UI | Tailwind CSS v4 + shadcn/ui v4 (Base UI primitives) |
| Auth & DB | Supabase (Postgres + RLS + Auth + Storage) |
| Validasi | Zod 4 |
| Form | react-hook-form 7 + React 19 `useActionState` |
| Tabel | @tanstack/react-table 9 |
| Rate Limiter | @upstash/redis (production), memory fallback (dev) |
| Testing | Vitest 5 + Testing Library |

---

## Perintah Build / Test / Run

```bash
npm install --include=dev   # Install dependencies (SELALU pakai --include=dev)
npm run dev                 # Development server (http://localhost:3000)
npm run build               # Build production + typecheck
npm run lint                # ESLint
npm test                    # Test suite (Vitest)
npm run test:watch          # Test watch mode
npm start                   # Jalankan hasil build
npm run db:setup            # Auto migration + seed database
```

> **Penting:** Jika environment punya `NODE_ENV=production`, npm otomatis
> menghapus devDependencies. Selalu pakai `--include=dev`.

---

## Aturan Wajib

### 1. Arsitektur & Pola Kode

- **Feature module pattern:** Setiap fitur ada di `src/features/<nama>/` dengan
  `schema.ts` (Zod) dan `service.ts` (business logic).
- **Server Action pattern:** Urutan selalu: `guardAction()` → parse/validasi →
  service → `revalidatePath()`.
- **Page pattern:** `requirePermission()` → fetch data → render client component
  dengan permission booleans.
- **Permission dicek di 3 tempat:** page (redirect), client (conditional render),
  action (`guardAction`). RLS menjadi lapisan enforcement terakhir.

### 2. Keamanan

- **JANGAN** bypass `guardAction()` di Server Actions.
- **JANGAN** expose `SUPABASE_SERVICE_ROLE_KEY` ke browser/client code.
- **SELALU** buat RLS policy untuk tabel baru di migration SQL.
- **SELALU** sertakan `school_id` sebagai foreign key di tabel baru (tenant
  isolation).
- Trigger `protect_profile_privileges` mencegah privilege escalation — jangan
  dinonaktifkan.

### 3. UI & Desain

- **SELALU** ikuti palet warna kustom hijau-hutan (lihat `knowledge/design.md`).
  **JANGAN** gunakan warna Tailwind default (`text-green-600`, `bg-blue-500`).
- **SELALU** gunakan komponen dari `@/components/ui/` — jangan buat ulang.
- **SELALU** gunakan `FieldLabel` (dari `@/features/pegawai/FieldLabel.tsx`)
  untuk label form.
- **SELALU** gunakan `useActionState` (React 19) untuk form submission.
- **SELALU** tampilkan toast error (`toast.error`) dan banner sukses.
- Form dialog besar: fixed header + scrollable body + fixed footer.
- Tabel dibungkus `Card` dengan `CardContent className="px-0"`.

### 4. Database & Migration

- Migration berurutan di `supabase/migrations/` dengan prefix `0001_`, `0002_`,
  dst.
- **JANGAN** modifikasi migration yang sudah ada. Buat migration baru.
- Tambahkan trigger `set_updated_at` untuk tabel baru yang punya kolom
  `updated_at`.
- Tambahkan index pada kolom `school_id` dan kolom-kolom yang sering di-filter.

### 5. Menambah Modul Baru

1. Tambahkan permission di migration SQL baru.
2. Tambahkan slug di `src/lib/rbac.ts` → `PERMISSIONS`.
3. Tambahkan label di `MODULE_LABELS` dan urutan di `MODULE_ORDER`.
4. Buat halaman di `src/app/(app)/<modul>/` + panggil `requirePermission(...)`.
5. Tambahkan item menu di `src/lib/nav.ts` → `MAIN_NAV`.
6. Buat feature module di `src/features/<modul>/` (`schema.ts` + `service.ts`).
7. Buat RLS policy di migration.
8. Tambahkan TypeScript types di `src/lib/types.ts`.

### 6. Konvensi Penamaan

| Konteks | Konvensi | Contoh |
|---|---|---|
| Tabel DB | snake_case | `student_enrollments` |
| Kolom DB | snake_case | `school_id`, `nama_lengkap` |
| TypeScript type | PascalCase | `StudentEnrollment` |
| Component | PascalCase | `StudentFormDialog` |
| File component | kebab-case | `student-form-dialog.tsx` |
| Permission slug | `modul.aksi` | `students.create` |
| Route | kebab-case | `/akademik/tahun-ajaran` |
| Feature folder | kebab-case | `fee-structure` |
| Environment var | UPPER_SNAKE | `SUPABASE_SERVICE_ROLE_KEY` |

### 7. Bahasa

- Kode (variabel, fungsi, komponen) → **Inggris**.
- Konten UI (label, pesan, toast) → **Bahasa Indonesia**.
- Komentar boleh dua bahasa, utamakan Bahasa Indonesia untuk penjelasan bisnis.

---

## Struktur Proyek (Ringkas)

```
src/
  app/(auth)/login/        # Halaman login
  app/(app)/               # Area terproteksi
    dashboard/             # Dashboard
    users/                 # CRUD user
    roles/                 # CRUD role + permission matrix
    sekolah/               # Manajemen sekolah (super admin)
    profil-sekolah/        # Profil sekolah
    pegawai/               # Data pegawai
    siswa/                 # Data siswa
    master/                # Master data
    akademik/              # Akademik (tahun ajaran, kelas, enrollment)
    keuangan/              # Keuangan, tagihan, diskon
  components/ui/           # shadcn/ui components
  components/app-shell/    # Sidebar, topbar
  features/                # Feature modules (schema + service)
  lib/                     # Shared utilities
    auth.ts                # getCurrentUser, requirePermission
    rbac.ts                # Permission constants + can()
    nav.ts                 # Sidebar navigation config
    types.ts               # TypeScript types
    action-guard.ts        # Server Action guard
    supabase/              # Supabase clients (server, admin, proxy, storage)
  proxy.ts                 # Auth proxy (session validation)
supabase/
  migrations/              # 36 migration files (0001–0036)
  bootstrap.sql            # Initial school + super admin setup
```

---

## Dokumen Referensi (Knowledge)

Baca dokumen-dokumen berikut sebelum membuat perubahan besar atau fitur baru:

| Dokumen | Path | Isi |
|---|---|---|
| **PRD** | [`knowledge/prd.md`](knowledge/prd.md) | Product Requirements Document lengkap: spesifikasi fitur, role, modul aktif & direncanakan. |
| **Arsitektur** | [`knowledge/ARCHITECTURE.md`](knowledge/ARCHITECTURE.md) | Struktur folder, alur request/data, hierarki modul, dan pola aplikasi dasar. |
| **Tech Stack** | [`knowledge/TECH_STACK.md`](knowledge/TECH_STACK.md) | Versi library (Next.js, React 19), aturan penulisan kode, penamaan file, dan pola terlarang. |
| **Model Data** | [`knowledge/DATA_MODEL.md`](knowledge/DATA_MODEL.md) | Pemetaan relasi tabel database (PostgreSQL), tipe data penting, dan aturan RLS. |
| **API** | [`knowledge/API.md`](knowledge/API.md) | Daftar endpoint (Server Actions) utama, format request/response standar (`FormState`). |
| **Keputusan Teknis** | [`knowledge/DECISIONS.md`](knowledge/DECISIONS.md) | ADR (Architecture Decision Records) untuk mencegah usulan alternatif atas keputusan yang sudah ada (misal: kenapa tidak pakai Redux/Prisma). |
| **Standar Desain** | [`knowledge/design.md`](knowledge/design.md) | Palet warna (hex), tipografi, template form/tabel/dialog, sizing reference, dan 10 aturan desain wajib. |
| **Testing** | [`knowledge/TESTING.md`](knowledge/TESTING.md) | Cara menjalankan tes (Vitest + RTL), dan contoh cara me-mock Supabase dan Server Actions. |
| **Changelog** | [`CHANGELOG.md`](CHANGELOG.md) | Catatan ringkas lintas-sesi berisi perubahan terbaru, fitur baru, dan bugfix. |

---

## File Konfigurasi Penting

| File | Fungsi |
|---|---|
| `next.config.ts` | Security headers (CSP, X-Frame-Options), allowed dev origins |
| `components.json` | Konfigurasi shadcn/ui |
| `tsconfig.json` | TypeScript config, path alias `@/` → `./src/` |
| `vitest.config.mts` | Vitest config |
| `.env.example` | Template environment variables |
| `eslint.config.mjs` | ESLint 9 flat config |
