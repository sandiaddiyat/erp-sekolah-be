# 📋 Issue: Konsistensi Arsitektur Bersih (Service Layer) di Semua Fitur

**Prioritas**: High
**Target Pelaksana**: Junior Programmer / AI Model
**Branch saran**: `refactor/service-layer-consistency`

---

## Latar Belakang

Code review menunjukkan arsitektur project sudah bagus, tetapi **tidak konsisten**:

- ✅ Fitur **users** sudah menerapkan pola bersih: service layer terpisah (`src/features/users/service.ts`), schema Zod terpisah, dependency injection, dan sudah bisa dites.
- ❌ Fitur **roles** dan **sekolah** masih monolitik — semua aturan bisnis, validasi, dan query database bercampur di dalam `actions.ts` (masing-masing ~230 dan ~300 baris).

Referensi pola target: **`src/features/users/`** (jangan berimprovisasi, ikuti persis pola ini).

```
src/features/<fitur>/
├── schema.ts    → validasi Zod + parsing input (satu-satunya yang tahu nama field form)
├── service.ts   → ATURAN BISNIS murni (tanpa FormData, tanpa revalidatePath, tanpa Next.js)
└── __tests__/   → unit test service & schema
```

Aturan pembagian tanggung jawab:

| Layer | Boleh | Dilarang |
|---|---|---|
| `actions.ts` (di `src/app/...`) | guard → parse → panggil service → revalidatePath | logika bisnis, query langsung |
| `service.ts` | query DB, aturan bisnis, cek permission | FormData, revalidatePath, import Next.js |
| `schema.ts` | Zod, baca FormData | query DB, aturan bisnis |

---

## Tahap 1: Refactor Fitur Roles ke Service Layer

**File terdampak**: `src/app/(app)/roles/actions.ts`, buat baru `src/features/roles/{schema,service}.ts`

### Langkah

1. Buat `src/features/roles/schema.ts`:
   - Pindahkan `saveSchema` (Zod) dari actions ke sini.
   - Buat fungsi `readSaveRoleInput(formData)` yang mengembalikan hasil parse (ikuti pola `readSaveUserInput` di `src/features/users/schema.ts`).
   - **Masukkan semua validasi ke Zod** — hapus validasi regex manual jika ada.
2. Buat `src/features/roles/service.ts`:
   - Pindahkan seluruh aturan bisnis dari actions: cek permission, cegah privilege escalation, buat/edit role dengan slug unik, sinkronisasi `role_permissions`, validasi sebelum hapus (role sistem, role masih dipakai user).
   - Definisikan `RoleMutationsDeps` (client Supabase di-inject via parameter, pola sama dengan `UserMutationsDeps`).
   - Semua fungsi mengembalikan `MutationResult` dari `@/lib/result`.
3. Sederhanakan `actions.ts` menjadi adapter tipis: guard → parse → service → revalidate.
4. Hapus file sisa `src/features/users/actions.new.ts` (file sampah sisa refactor sebelumnya — isinya sudah pindah).

### Kriteria Selesai

- [ ] `actions.ts` roles berisi < ~80 baris, tanpa query database langsung
- [ ] Semua query & aturan bisnis ada di `service.ts`
- [ ] Semua validasi input lewat Zod
- [ ] `npx tsc --noEmit` dan `npm run build` lulus
- [ ] Tambah/edit/hapus role masih berfungsi (test manual)

---

## Tahap 2: Refactor Fitur Sekolah ke Service Layer

**File terdampak**: `src/app/(app)/sekolah/actions.ts`, buat baru `src/features/schools/{schema,service}.ts`

### Langkah

1. Buat `src/features/schools/schema.ts`:
   - Pindahkan `schoolSchema` ke sini.
   - **Pindahkan validasi regex manual (`EMAIL_PATTERN`, `DATE_PATTERN`) ke dalam Zod** — gunakan `z.email()` dan `z.string().regex()` sehingga helper regex di actions bisa dihapus.
2. Buat `src/features/schools/service.ts`:
   - Pindahkan logika: buat sekolah via RPC `create_school`, update sekolah, simpan catatan (`saveSchoolNote`), ubah status, dan pembuatan admin pertama (bagian `create_admin`).
   - Pembuatan admin pertama bisa dipecah jadi fungsi tersendiri di service agar `saveSchool` tidak terlalu panjang.
   - Kembalikan `MutationResult`.
3. Sederhanakan `actions.ts` menjadi adapter tipis.

### Kriteria Selesai

- [ ] Tidak ada lagi validasi regex manual di actions (semua di Zod)
- [ ] `actions.ts` sekolah berisi < ~80 baris
- [ ] Alur "daftar sekolah + admin pertama" masih berfungsi (test manual, termasuk skenario admin gagal dibuat)
- [ ] `npx tsc --noEmit` dan `npm run build` lulus

---

## Tahap 3: Unit Test untuk Service Layer

**File baru**: test di `src/features/roles/__tests__/` dan `src/features/schools/__tests__/`

### Langkah

1. Test fungsi murni lebih dulu (paling mudah):
   - Fungsi-fungsi helper di service yang tidak melakukan I/O (contoh pola: `findEscalatingSlugs` di users yang sudah murni). Jika ada logika yang bisa dipisah jadi murni (mis. generator slug unik, validasi status), pisaahkan agar mudah dites.
2. Test service dengan **mock Supabase client**:
   - Buat mock sederhana untuk `SupabaseClient` (objek dengan method `from()`, `auth.admin.*` yang diperlukan) — jangan panggil Supabase sungguhan.
   - Skenario minimum per fitur:
     - **roles**: sukses buat role, gagal karena role sistem dihapus, gagal karena role masih dipakai, ditolak karena privilege escalation.
     - **schools**: sukses update, sekolah tidak ditemukan, admin pertama gagal dibuat (sekolah tetap tersimpan).
3. Jalankan `npm run test` dan pastikan semua lulus.

### Kriteria Selesai

- [ ] Minimal 5 test case per fitur baru
- [ ] `npm run test` lulus tanpa failure
- [ ] Service layer terbukti bisa dites tanpa database nyata

---

## Tahap 4 (Opsional / Backlog): Repository Pattern

**Status**: Tidak wajib dikerjakan sekarang. Kerjakan hanya jika Tahap 1–3 selesai dan sudah stabil.

### Rencana

1. Identifikasi query yang berulang di banyak halaman (contoh: ambil daftar sekolah, cek role milik user).
2. Buat modul query terpusat, mis. `src/features/<fitur>/queries.ts` atau `src/lib/repositories/`.
3. Pindahkan query yang diduplikasi (page + service) ke modul tersebut satu per satu.

### Kriteria Selesai

- [ ] Query berulang terpusat di satu tempat per entitas
- [ ] Halaman masih menampilkan data yang sama

---

## Urutan Pengerjaan

```
1. Tahap 1 (roles)     — lakukan dulu, fiturnya paling kecil
2. Tahap 2 (sekolah)   — pola sama, sedikit lebih besar
3. Tahap 3 (testing)   — setelah service stabil
4. Tahap 4 (repo)      — opsional
```

> **PENTING**: Kerjakan satu tahap per satu commit. Jangan mencampur refactor fitur berbeda dalam satu commit.

Contoh pesan commit:
```
refactor: pindahkan logika roles ke service layer
refactor: pindahkan logika sekolah ke service layer, validasi ke Zod
test: tambah unit test service roles & schools
```

---

## Catatan untuk Pelaksana

1. **Ikuti pola `src/features/users/`** secara persis — nama fungsi, tipe `MutationResult`, struktur `Deps`. Jangan menciptakan pola baru.
2. **Jangan ubah perilaku aplikasi.** Ini refactor murni: hasil yang sama, struktur lebih baik.
3. **Jangan ubah RLS atau schema database.**
4. **Perhatikan komentar penting di service users** (mis. alasan kenapa penugasan sekolah user baru harus lewat service role) — logika serupa di sekolah punya alasan yang sama.
5. Setiap selesai satu tahap: `npx tsc --noEmit`, `npm run build`, `npm run test`, lalu test manual halaman terkait sebelum commit.
6. Jika ragu, tanyakan daripada menebak.
