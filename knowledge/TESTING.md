# Panduan Pengujian (Testing) — ERP Sekolah

> Dokumen ini menjelaskan standar pengujian, *tools* yang digunakan, serta
> cara menjalankan tes di dalam proyek ERP Sekolah. Seluruh tes harus
> memastikan reliabilitas, terutama untuk fitur keamanan dan perhitungan keuangan.

---

## 1. Tools & Framework

Proyek ini menggunakan ekosistem pengujian modern yang berfokus pada kecepatan dan kemudahan *mocking*:
- **Test Runner**: [Vitest](https://vitest.dev/) (`vitest`)
- **UI Testing**: [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (`@testing-library/react`)
- **DOM Matchers**: `@testing-library/jest-dom`
- **Environment**: `jsdom` (untuk mensimulasikan browser di dalam node)

---

## 2. Cara Menjalankan Tes

Jalankan perintah berikut di terminal:

| Perintah | Fungsi | Kapan Digunakan |
|---|---|---|
| `npm test` | Menjalankan seluruh *test suite* sekali jalan. | Sebelum *commit* atau di *CI/CD pipeline*. |
| `npm run test:watch` | Menjalankan tes dalam *watch mode*. | Saat sedang mengembangkan atau melakukan *refactor* fitur. |
| `npx vitest run --coverage` | Menghasilkan laporan *code coverage*. | Untuk meninjau persentase kode yang telah dites. |

---

## 3. Standar & Cakupan (Coverage) yang Diharapkan

Meskipun kita tidak memaksakan 100% *code coverage*, terdapat bagian-bagian sistem yang **wajib** dites:

### 3.1. Wajib (Mandatory)
1. **Utility Keamanan & RBAC** (`src/lib/auth.ts`, `src/lib/rbac.ts`, `src/lib/action-guard.ts`). Kesalahan logika di sini berakibat fatal pada bocornya data.
2. **Schema Validations** (`src/features/*/schema.ts`). Pastikan validasi Zod memblokir *input* yang tidak valid (misal, nilai minus pada pembayaran).
3. **Logika Keuangan & Kalkulasi** (Service tagihan, kalkulasi diskon, pembayaran). *Bug* pada perhitungan uang tidak dapat ditoleransi.

### 3.2. Disarankan (Recommended)
1. **Business Logic Services** (`src/features/*/service.ts`). Menguji *branching* logika (misal: gagal jika siswa tidak aktif).
2. **UI Components Kompleks**. Seperti komponen *Client* yang menangani form kalkulasi berlapis atau fungsi filter kompleks.

### 3.3. Tidak Perlu (Low Priority)
1. Komponen statis atau halaman Server Components yang hanya meneruskan data ke UI.
2. Library komponen dasar dari *shadcn/ui* (sudah dites oleh *library* aslinya).

---

## 4. Pola Penulisan Tes (Best Practices)

### 4.1. Lokasi File Tes
Semua file tes diletakkan berdekatan dengan file aslinya atau di dalam folder `__tests__` pada setiap modul.
- Format penamaan: `[nama-file].test.ts` atau `[nama-file].test.tsx`.
- Contoh: `src/lib/__tests__/rbac.test.ts`.

### 4.2. Mocking Database (Supabase)
Karena tes berjalan di lingkungan terisolasi tanpa koneksi langsung ke *database production*, semua pemanggilan Supabase **wajib di-mock**.

Contoh menggunakan fitur *mock* bawaan Vitest:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { deleteSiswaRecord } from '../service';

// Mock dependensi
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null })
};

describe('deleteSiswaRecord', () => {
  it('seharusnya mengembalikan hasil sukses jika tidak ada error dari database', async () => {
    // eksekusi dengan menyuntikkan mock client
    const result = await deleteSiswaRecord({ supabase: mockSupabase as any }, mockUser, "123");
    
    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('students');
  });
});
```

### 4.3. Pengujian UI (React Testing Library)
Fokuslah menguji **behavior (perilaku)** dari perspektif pengguna, bukan detail implementasi internal komponen.

- **Dilarang**: Mencari elemen menggunakan class CSS (seperti `.bg-red-500`).
- **Disarankan**: Gunakan `getByRole`, `getByLabelText`, atau `getByText`.

Contoh:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldLabel } from '../FieldLabel';

describe('FieldLabel', () => {
  it('seharusnya menampilkan tanda bintang merah jika wajib (required)', () => {
    render(<FieldLabel required>Nama Lengkap</FieldLabel>);
    
    expect(screen.getByText('Nama Lengkap')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-[#d06a5d]');
  });
});
```

---

## 5. Pengujian Server Actions

Karena *Server Actions* (di `actions.ts`) menangani alur dari HTTP Form (FormData), Anda dapat mengujinya dengan membangun FormData *dummy*. Selalu *mock* fungsi `guardAction()` saat menguji *Server Action* agar tes tidak terjebak pada validasi sesi.

```typescript
import { saveSiswa } from '../actions';
import { guardAction } from '@/lib/action-guard';

vi.mock('@/lib/action-guard', () => ({
  guardAction: vi.fn().mockResolvedValue({ user: mockSuperAdmin })
}));

it('seharusnya mengembalikan error jika input FormData tidak valid', async () => {
  const formData = new FormData();
  // Sengaja tidak mengisi nama_lengkap yang wajib
  
  const result = await saveSiswa(undefined, formData);
  expect(result?.error).toBeDefined();
});
```
