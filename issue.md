# Perencanaan Tugas: Peningkatan Keamanan Lanjutan & Skalabilitas

Dokumen ini berisi panduan dan daftar tugas (*task*) teknis yang harus diimplementasikan oleh *junior programmer* atau *AI assistant*. Tugas ini berfokus pada penyempurnaan perlindungan autentikasi dan pembuatan perlindungan data tingkat tinggi (arsitektur *Multi-Tenant*).

---

## 1. Implementasi Rate Limiter (Redis) & Vercel IP Resolver (High Priority)

**Konteks Masalah:**
Proteksi anti-*brute-force* saat ini menggunakan struktur RAM (*in-memory*) yang akan selalu ter-reset jika di-deploy ke Vercel (Serverless). Selain itu, sistem masih membaca header IP standar yang rentan terhadap manipulasi (IP Spoofing).

**Tahapan Implementasi:**
1. **Setup Redis Client:**
   - Instal library: `npm install @upstash/redis` (atau `ioredis`).
2. **Amankan Resolver IP:**
   - Buka `src/app/(auth)/login/actions.ts`.
   - Modifikasi fungsi `clientIp()`. Jika aplikasi mendeteksi beroperasi di *environment* Vercel, **wajib** hanya membaca IP dari header `x-vercel-forwarded-for` (karena header ini diinjeksi paksa oleh Vercel dan tidak bisa dipalsukan oleh klien).
3. **Logika Atomic Reservation (Redis):**
   - Buat file `src/lib/rate-limit.ts`.
   - Integrasikan pengecekan Redis. Buat batas *rate limit* secara paralel: **satu untuk IP Address, satu untuk kombinasi Email**.
   - Gunakan operasi atomik (`INCR` atau eksekusi *Lua Script*) agar limit tidak bisa ditembus oleh *request* paralel (*race condition*).
4. **Logika Fail-Closed & Fallback:**
   - Buat logika khusus: Jika berada di environment *Production* dan koneksi Redis *down/timeout*, sistem **wajib menolak** (*fail-closed*) permintaan login demi keamanan.
   - Sebaliknya, jika berada di environment *Development* lokal dan konfigurasi Redis kosong, berikan *fallback* ke mode *in-memory* biasa agar pengalaman *ngoding* tidak terganggu.

---

## 2. Pembuatan Migrasi Row Level Security (RLS) & Tenant Integrity (High Priority)

**Konteks Masalah:**
Aplikasi ERP Sekolah adalah aplikasi berbasis *Multi-Tenant* (banyak sekolah dalam 1 database). Jika kode API mengalami *bug* logika, data sekolah A berpotensi bocor ke sekolah B. Keamanan ini harus dikunci mutlak dari *level database*.

**Tahapan Implementasi:**
1. **Pembuatan Policy RLS:**
   - Buat file migrasi SQL baru di dalam folder `supabase/migrations/` (misalnya `202410XXXXXXXX_enable_rls.sql`).
   - Nyalakan RLS (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY`) untuk seluruh tabel inti seperti: `akademik`, `billing`, dan diskon.
   - Tulis SQL *policy* di mana baris data hanya bisa diakses jika `tenant_id` (atau `school_id`) pada tabel sama persis dengan `school_id` yang tertanam pada *token sesi JWT* user yang memanggil permintaan.
2. **Composite Tenant Foreign Keys:**
   - Di dalam file migrasi, ubah struktur *Foreign Key* relasi lintas tabel.
   - Contoh nyata: Relasi pada tabel `pembayaran` tidak boleh sekadar mengacu pada `invoice_id`. Relasi harus dijadikan *composite key* -> `FOREIGN KEY (school_id, invoice_id) REFERENCES invoice (school_id, invoice_id)`. Ini secara matematis menolak *bug* aplikasi yang mencoba menyambungkan pembayaran dari sekolah A ke tagihan sekolah B.

---

## 3. Pengetatan Alur Sesi & Regression Testing (Medium Priority)

**Konteks Masalah:**
Pembaruan tingkat lanjut ini berpotensi rusak apabila ada perubahan sistem di masa depan tanpa pengujian otomatis.

**Tahapan Implementasi:**
1. **Pengetatan Alur Login:**
   - Pastikan di `actions.ts` pembersihan (pemanggilan `supabase.auth.signOut()`) diterapkan ketat setiap kali terjadi kegagalan rekonsiliasi hak akses (permission).
2. **Penulisan Automated Test (Regression):**
   - Jika belum terkonfigurasi, instal `npm install -D vitest`.
   - Buat file pengujian (misal `actions.test.ts`).
   - Buat tes otomatis yang menguji simulasi:
     - 6 kali percobaan login gagal dengan IP yang sama (harus terblokir).
     - Pembacaan header `x-vercel-forwarded-for`.
     - Tes menembak (*query*) data antar sekolah yang berbeda (RLS harus *throw error* ke sistem).

