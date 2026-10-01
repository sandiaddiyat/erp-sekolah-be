# Tech Stack & Aturan Kode — ERP Sekolah

> Dokumen ini memuat versi spesifik library yang digunakan, konvensi penamaan,
> gaya penulisan kode (code style), serta *pattern* yang diwajibkan dan dilarang
> dalam pengembangan aplikasi ini.

---

## 1. Versi Library (Tech Stack)

Aplikasi ini dibangun dengan *stack* modern menggunakan rilis terbaru (per akhir tahun). Hindari me-downgrade library utama tanpa alasan kuat.

| Kategori | Library | Versi | Keterangan |
|---|---|---|---|
| **Framework** | Next.js | `16.3.5` | Menggunakan App Router (`app/`). |
| **View Layer** | React & React DOM | `19.2.8` | Mendukung Server Components, Server Actions, & hooks terbaru (seperti `useActionState`). |
| **Language** | TypeScript | `5.9.3` | *Strict mode* aktif. |
| **Styling** | Tailwind CSS | `v4` | Memanfaatkan fitur terbaru v4 (termasuk postcss plugin). |
| **UI Components** | shadcn/ui | `^4.21.0` | Dibangun di atas `@base-ui/react` (`^1.8.0`). |
| **Auth & DB** | Supabase SDK | `^2.116.0` | Komunikasi ke PostgreSQL dan Storage. |
| **SSR Auth** | `@supabase/ssr` | `^0.12.7` | Manajemen cookie dan sesi JWT Next.js. |
| **Validasi** | Zod | `^4.6.2` | Validasi *schema* form dan API. |
| **Form Handling** | `react-hook-form` | `^7.89.0` | Integrasi state dan validasi form di *client*. |
| **Tabel** | `@tanstack/react-table` | `^9.2.4` | Implementasi tabel yang kaya fitur. |
| **Icons** | `lucide-react` | `^1.45.0` | Icon set yang konsisten. |
| **Caching/Rate Limit**| `@upstash/redis` | `^1.39.0` | Digunakan untuk limitasi *rate*. |
| **Testing** | Vitest | `^5.0.0` | Framework pengujian, bersama `jsdom` dan RTL. |
| **Linter** | ESLint | `^9` | Menggunakan konfigurasi flat terbaru (`eslint.config.mjs`). |

---

## 2. Konvensi Penamaan (Naming Conventions)

Konsistensi penamaan adalah kunci. Ikuti aturan di bawah ini secara ketat:

| Konteks | Gaya Penulisan | Contoh | Catatan |
|---|---|---|---|
| **Nama File/Folder** | `kebab-case` | `siswa-client.tsx`, `fee-structure` | Seluruh nama file dan folder harus huruf kecil dan dipisah strip. |
| **Komponen React** | `PascalCase` | `StudentFormDialog`, `AppShell` | Nama *function component*. |
| **Type/Interface** | `PascalCase` | `CurrentUser`, `StudentEnrollment` | Type bawaan / ekspor TypeScript. |
| **Variabel/Fungsi** | `camelCase` | `getCurrentUser`, `saveSiswaRecord` | Logika, state, fungsi standar. |
| **Konstanta Global** | `UPPER_SNAKE` | `PERMISSIONS`, `SUPABASE_URL` | Nilai statis (sering di-export). |
| **Database Tabel** | `snake_case` | `student_enrollments` | Selalu gunakan bentuk jamak (plural). |
| **Database Kolom** | `snake_case` | `school_id`, `nama_lengkap` | Konsisten di schema dan database. |
| **Permission Slug** | `modul.aksi` | `students.view`, `finance.manage` | Prefix modul diikuti kata kerja. |
| **URL Route** | `kebab-case` | `/keuangan/tagihan-otomatis` | Ramah SEO dan mudah dibaca. |

---

## 3. Gaya Penulisan Kode (Code Style)

### 3.1. Penggunaan Bahasa
- **Kode**: Seluruh variabel, nama fungsi, nama komponen, dan schema *database* harus menggunakan **Bahasa Inggris**.
- **UI (Tampilan)**: Konten untuk pengguna akhir (label form, pesan error, *toast*, *placeholder*) harus menggunakan **Bahasa Indonesia**.
- **Komentar**: Disarankan menggunakan Bahasa Indonesia untuk menjelaskan logika bisnis, dan Bahasa Inggris untuk dokumentasi teknis atau JSDoc.

### 3.2. Pola React 19 & Next.js 16
- **Server Components Prioritas**: Selalu gunakan Server Components secara *default*. Hanya tambahkan `"use client"` di file komponen yang membutuhkan interaktivitas (seperti form, onClick, atau hooks React).
- **Server Actions untuk Mutasi**: Jangan membuat *API Route* (`route.ts`) untuk form submission biasa. Gunakan fitur **Server Actions** (`useActionState`).
- **Data Fetching**: Lakukan pemanggilan data secara langsung di dalam Server Component (tanpa `useEffect` atau library pihak ketiga, gunakan Supabase client server).

### 3.3. Integrasi Komponen UI
- Seluruh elemen antarmuka dasar harus bersumber dari `@/components/ui/` (shadcn). **Dilarang** membuat komponen primitif baru jika sudah tersedia (seperti Button, Input, Select, dll).
- Gunakan `FieldLabel` khusus (berada di `@/features/pegawai/FieldLabel.tsx`) untuk merender label pada form agar indikator "wajib" (`*`) dan "opsional" konsisten secara visual.
- Hindari penggunaan warna *hardcode* standar Tailwind (seperti `bg-green-500`). Gunakan kode *hex* dari palet warna kustom yang didefinisikan (lihat `knowledge/design.md`).

---

## 4. Pola yang Dipakai dan Dilarang

### 4.1. Pola yang DIWAJIBKAN (MANDATORY PATTERNS)

1. **Feature Module Pattern**:
   Semua logika bisnis, operasi database, dan skema validasi harus dimasukkan ke dalam modul terpisah di `src/features/<modul>/`. Jangan menulis mutasi langsung di file `actions.ts`.
   - `schema.ts`: Berisi Zod schema dan fungsi `readInput(formData)`.
   - `service.ts`: Berisi logika CRUD dan pemanggilan Supabase, yang mengembalikan objek hasil *success* atau *error*.

2. **Server Action Guard**:
   Setiap Server Action **WAJIB** memanggil `guardAction()` sebagai langkah pertama untuk memvalidasi autentikasi, status akun, dan masa langganan.
   ```typescript
   const guard = await guardAction({ permission: PERMISSIONS.studentsCreate });
   if ("error" in guard) return { error: guard.error };
   ```

3. **Three-Layer Permission Check**:
   Izin pengguna (RBAC) harus dicek di tiga tempat:
   - **Page Level**: Menggunakan `requirePermission()` sebelum merender halaman.
   - **Client Level**: Merender tombol "Tambah" atau "Ubah" hanya jika `permissions.create` / `update` bernilai *true*.
   - **Action Level**: Melemparkan argumen `permission` ke dalam `guardAction()`.

4. **Multi-Tenant RLS Policy**:
   Setiap menambahkan tabel baru yang sifatnya bukan *global*, **WAJIB** menyediakan kolom `school_id` sebagai `Foreign Key` ke tabel `schools`. Selain itu, wajib menambahkan *Row Level Security* (RLS) di file migrasi SQL agar data tidak bocor antar sekolah.

### 4.2. Pola yang DILARANG (PROHIBITED PATTERNS)

1. **DILARANG Mengekspos `SUPABASE_SERVICE_ROLE_KEY`**:
   `admin` client hanya boleh digunakan di dalam operasi khusus di *server* (seperti *webhook* atau pembuatan tenant baru). Jangan pernah membuat Supabase client dengan `SUPABASE_SERVICE_ROLE_KEY` di *client component* atau menampilkannya ke *browser*.

2. **DILARANG Melewati `guardAction()`**:
   Setiap mutasi (insert, update, delete) wajib dijaga oleh `guardAction()`. Melakukan mutasi tanpa ini adalah pelanggaran keamanan sistem.

3. **DILARANG Membuat Koneksi Database / Raw Query Langsung**:
   Selalu gunakan `createClient()` yang telah disiapkan di `@/lib/supabase/server.ts` atau `@/lib/supabase/proxy.ts`. Dilarang menulis raw SQL query langsung di dalam kode Node.js; semuanya harus lewat mekanisme Supabase SDK (PostgREST) atau RPC.

4. **DILARANG Modifikasi Migrasi yang Lama**:
   Jika ingin melakukan perubahan struktur database, **DILARANG** mengedit file migrasi (seperti `0010_siswa.sql`) yang sudah ada. **Selalu buat file migrasi baru** (misalnya `0037_...`) agar riwayat pengembangan dan iterasi deployment aman.

5. **DILARANG Menangani Autentikasi secara Manual**:
   Refresh *token* dan pengecekan otorisasi awal sudah ditangani oleh Middleware di `proxy.ts` dan fungsi `getCurrentUser()`. Jangan menggunakan mekanisme manual untuk manajemen JWT di *frontend*.
