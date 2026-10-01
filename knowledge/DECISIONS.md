# Keputusan Teknis (Architectural Decisions) — ERP Sekolah

> Dokumen ini mencatat keputusan-keputusan teknis krusial yang telah disepakati untuk arsitektur sistem beserta alasannya (Architecture Decision Record / ADR).
> **Tujuan:** Mencegah developer baru atau AI model mengusulkan ulang teknologi atau arsitektur yang sudah dievaluasi dan diputuskan untuk tidak digunakan.

---

## 1. Penggunaan Server Actions vs API Routes

**Keputusan:** Semua operasi mutasi (CRUD dari *Client* ke *Server*) **WAJIB** menggunakan **React Server Actions** bersamaan dengan hook `useActionState` (React 19). Kita **TIDAK** menggunakan API Routes klasik (`pages/api` atau `app/api/route.ts`) untuk kebutuhan internal aplikasi.

**Alasan:**
- **Keamanan Bawaan**: Server Actions menjaga agar logika, *secret keys*, dan operasi database (lewat Supabase service/client) tidak terekspos ke *Client*.
- **Tanpa Fetch Boilerplate**: Kita tidak perlu menulis kode `fetch('/api/...', { method: 'POST' })` beserta manajemen `isLoading` yang rumit. `useActionState` dan `useTransition` menanganinya secara natif.
- **Progressive Enhancement**: Form yang menggunakan Server Actions dapat beroperasi meski JavaScript belum termuat penuh di *browser* klien (meskipun jarang terjadi di aplikasi modern, hal ini memastikan *graceful degradation*).

---

## 2. Supabase RLS untuk Multi-Tenancy vs Database-per-Tenant

**Keputusan:** Isolasi data sekolah (Multi-Tenant) dilakukan di level baris (Row-Level) menggunakan fitur **Row Level Security (RLS)** dari PostgreSQL/Supabase. Kita **TIDAK** membuat skema (schema) berbeda atau *instance* database berbeda untuk tiap sekolah.

**Alasan:**
- **Skalabilitas Harga dan Operasional**: Mengelola ratusan *schema* atau *instance* sangat sulit dalam proses pembaruan (migrasi) struktur tabel. Dengan satu skema dan RLS, satu perintah migrasi akan langsung memengaruhi seluruh tenant.
- **Keamanan Tingkat Database**: Karena RLS tertanam di mesin PostgreSQL, kelalaian developer (seperti lupa menambahkan klausul `WHERE school_id = X` pada *query*) tidak akan mengakibatkan kebocoran data. PostgreSQL akan secara otomatis memblokir akses ke baris milik sekolah lain.

---

## 3. Tidak Ada Global State Management (Zustand/Redux)

**Keputusan:** Kita **TIDAK** menggunakan *state management library* global seperti Redux, MobX, atau Zustand.

**Alasan:**
- **Server Components & URL State**: Dengan paradigma Next.js App Router, sebagian besar data di-*fetch* langsung di Server Components dan diteruskan sebagai *props* ke Client. *State* lokal cukup dikelola menggunakan `useState` di komponen halaman terkait. Untuk *state* global (seperti *search query*, penomoran halaman/pagination), kita menyimpannya di URL (*search parameters*) sehingga dapat diakses ulang (URL *shareable*).
- **Pengurangan Kompleksitas**: Tidak ada kebutuhan *sync* *state* klien dan *server* yang kompleks. `revalidatePath` di Server Action otomatis melakukan penyegaran antarmuka ketika data di-update.

---

## 4. shadcn/ui & Tailwind CSS vs MUI/Bootstrap/Chakra

**Keputusan:** UI dibangun menggunakan komponen dari **shadcn/ui** yang memanfaatkan **Tailwind CSS v4** dan komponen *headless* dari **@base-ui/react**. Kita **TIDAK** menggunakan *library component* monolitik seperti Material UI (MUI), Bootstrap, atau Chakra UI.

**Alasan:**
- **Ownership Penuh**: shadcn/ui menyalin (bukan menginstalasi) komponen ke dalam folder `@/components/ui/`. Kita memiliki kendali 100% terhadap HTML, CSS, dan logika internal komponen untuk menyesuaikannya dengan kebutuhan *pixel-perfect* palet warna kita (lihat `knowledge/design.md`).
- **Tidak Bergantung pada Pihak Ketiga**: Jika ada pembaruan *React* yang memengaruhi *library* pihak ketiga (seperti *bug* SSR di MUI), kita tidak terhambat menunggu *patch*. Kita bisa memperbaikinya sendiri.
- **Ukuran Bundel (Bundle Size)**: Komponen *headless* dari `@base-ui` hanya dimuat jika di-import. Tailwind membuang kelas CSS yang tidak terpakai, sehingga bundel JavaScript/CSS sangat kecil.

---

## 5. Zod untuk Validasi vs Yup/Joi

**Keputusan:** **Zod** dipilih secara absolut sebagai *schema validation library*.

**Alasan:**
- **Developer Experience (TypeScript)**: Zod mendukung *inferensi tipe* secara otomatis (`z.infer<typeof schema>`). Kita tidak perlu mendefinisikan *interface* TypeScript dua kali, sehingga kode lebih *DRY* (Don't Repeat Yourself) dan bebas dari ketidakcocokan tipe antara skema validasi dengan *interface*.
- **Integrasi**: Zod terintegrasi sangat baik dengan `react-hook-form` di sisi klien.

---

## 6. Autentikasi dengan Supabase Auth vs NextAuth/Auth.js

**Keputusan:** Otentikasi dan sesi manajemen diserahkan penuh kepada **Supabase Auth** (lewat `@supabase/ssr`). Kita **TIDAK** menggunakan NextAuth (Auth.js) atau manajemen JWT *custom*.

**Alasan:**
- **Keandalan Ekosistem**: Supabase Auth terhubung langsung ke identitas database PostgreSQL (tabel `auth.users`). Hal ini mempermudah RLS; RLS membaca ID *user* secara instan. Menambahkan lapisan NextAuth di antaranya hanya akan menambah kerumitan sinkronisasi antara JWT NextAuth dengan kebutuhan token database Supabase.
- **Dukungan SSR**: Library `@supabase/ssr` telah dirancang khusus merawat *cookie* yang dapat diakses oleh Next.js Server Components maupun *Middleware*.

---

## 7. Direct Database Query via Supabase vs Prisma/TypeORM

**Keputusan:** Berkomunikasi dengan database menggunakan Supabase JS Client (`@supabase/supabase-js`) atau pemanggilan RPC (Remote Procedure Call). Kita **TIDAK** menggunakan ORM seperti Prisma atau TypeORM.

**Alasan:**
- **Optimalisasi RLS**: Supabase client secara *native* mewarisi sesi otentikasi dari *cookie* (*Anon Key*) dan menggunakan postgREST, yang langsung melewati pengecekan RLS PostgreSQL dengan baik. Mengonfigurasi Prisma untuk mewarisi identitas dan konteks `school_id` pada setiap permintaan secara dinamis sangat menantang dan memengaruhi performa (*connection pooling*).
- **TypeScript Generates**: Kita dapat membuat tipe data TS statis dari database Supabase secara otomatis (`supabase gen types`). Ini memberikan *auto-complete* pada objek data tanpa lapisan terjemahan dari ORM.
