# API & Server Actions — ERP Sekolah

> Dokumen ini memuat daftar *endpoint* dan Server Actions utama beserta bentuk
> *Request* dan *Response*-nya. Setiap kali ada perubahan fitur atau skema database
> yang memengaruhi antarmuka data, dokumen ini **WAJIB** diperbarui.

---

## 1. Konsep Dasar API (Next.js App Router)

Aplikasi ini menggunakan **Server Actions** sebagai pengganti utama REST API klasik (API Routes) untuk operasi mutasi data (CRUD) dari Client ke Server.

- **Request**: Menerima objek `FormData` standar.
- **Response**: Mengembalikan tipe data `FormState` standar:
  ```typescript
  type FormState = {
    error?: string;
    success?: string;
  } | undefined;
  ```
- **Security**: Setiap fungsi wajib memanggil `guardAction()` di baris pertama.

---

## 2. Modul: Manajemen Siswa (`features/siswa/actions.ts`)

### `saveSiswa(prevState, formData)`
Digunakan untuk membuat siswa baru atau memperbarui data siswa yang ada.

- **Request (FormData fields)**:
  - `id`: string (kosong jika *create*, UUID jika *update*)
  - `nama_lengkap`: string (wajib)
  - `nis`, `nisn`: string (opsional)
  - `jenis_kelamin`: "L" | "P" (opsional)
  - `agama_id`: UUID (opsional)
  - ... (seluruh field dari type `Siswa`)
  - `photo`: File Blob (opsional, untuk upload gambar)
- **Response**: `{ success: "Siswa berhasil disimpan" }` atau `{ error: "Pesan error" }`
- **Permission**: `students.create` atau `students.update`

### `deleteSiswa(id)`
Menghapus siswa berdasarkan ID.

- **Request (Args)**: `id` (UUID string)
- **Response**: `{ success: "Data siswa berhasil dihapus" }` atau `{ error: "Pesan error" }`
- **Permission**: `students.delete`

---

## 3. Modul: Keuangan & Tagihan (`features/keuangan/actions.ts` / `features/billing/actions.ts`)

### `generateInvoices(academicYearId, periodLabel)`
Membuat tagihan otomatis (Invoice) untuk semua siswa aktif pada tahun ajaran tertentu berdasarkan *fee_structures*.

- **Request (Args)**:
  - `academic_year_id`: UUID
  - `period_label`: string (misal: "Bulan Juli 2024")
- **Response**: `{ success: "150 tagihan berhasil dibuat" }` atau `{ error: "Gagal membuat tagihan" }`
- **Permission**: `billing.manage`

### `processPayment(prevState, formData)`
Mencatat pembayaran yang dilakukan oleh siswa terhadap suatu Invoice (Pembayaran v2).

- **Request (FormData fields)**:
  - `invoice_id`: UUID (wajib)
  - `nominal`: number (wajib)
  - `payment_method_id`: UUID (wajib)
  - `catatan`: string (opsional)
- **Response**: `{ success: "Pembayaran berhasil dicatat" }`
- **Permission**: `finance.payment_create`

---

## 4. Modul: Pendaftaran & Kelas (`features/akademik/actions.ts`)

### `enrollStudent(prevState, formData)`
Mendaftarkan siswa ke dalam suatu kelas di tahun ajaran tertentu.

- **Request (FormData fields)**:
  - `student_id`: UUID
  - `class_id`: UUID
  - `academic_year_id`: UUID
  - `enrollment_date`: string (YYYY-MM-DD)
- **Response**: `{ success: "Siswa berhasil didaftarkan" }`
- **Permission**: `academics.manage`

---

## 5. Modul: Autentikasi & Role (`features/auth/actions.ts` & `proxy.ts`)

### Middleware Auth (`proxy.ts`)
Bukan sebuah *action*, melainkan *middleware* Next.js yang berjalan di setiap *request*.
- **Fungsi**: Memverifikasi JWT cookie (`@supabase/ssr`).
- **Response**:
  - Valid: Lanjut ke halaman yang dituju.
  - Invalid / Expired: Redirect ke `/login`.

### `assignRole(userId, roleId)`
Menugaskan role tertentu kepada seorang user.

- **Request (Args)**: `user_id` (UUID), `role_id` (UUID)
- **Response**: `{ success: "Role berhasil diubah" }`
- **Permission**: `users.assign_role`

---

## 6. Standar Penanganan Error

Setiap error dari database atau validasi Zod **tidak boleh** membuat server *crash* atau membocorkan struktur *query* ke Client. Error harus ditangkap (*catch*) di level `service.ts` atau `actions.ts` dan dikembalikan sebagai teks ramah pengguna:

```typescript
// Contoh implementasi di service:
const { error } = await supabase.from('students').insert(data);
if (error) {
  // Parsing error Supabase ke pesan yang ramah
  if (error.code === '23505') {
    return { ok: false, error: "Data NIS sudah digunakan oleh siswa lain." };
  }
  return { ok: false, error: "Terjadi kesalahan pada database." };
}
```
