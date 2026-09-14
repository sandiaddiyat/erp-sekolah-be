# Daftar Issue & Rencana Perbaikan — ERP Sekolah

Dokumen ini berisi **2 issue yang saling independen**. Kerjakan berurutan. Keduanya
menyentuh file yang berbeda, jadi tidak akan bentrok.

| # | Issue | File yang diubah | Tingkat |
|---|-------|------------------|---------|
| 1 | Menu profil crash saat diklik; tombol **Keluar** tidak pernah muncul | `src/components/app-shell/user-menu.tsx` | Mudah (2 baris) |
| 2 | Admin sekolah tambah user: **"User dibuat, tetapi role gagal diberikan"** dan user baru tidak muncul di daftar | `src/app/(app)/users/actions.ts` + 1 file SQL baru | Sedang |

Kedua root cause **sudah dianalisis dan diverifikasi**. Jangan menganalisis ulang dari nol —
ikuti saja rencana di bawah. Bagian "Root cause" pada tiap issue berisi bukti, bukan tebakan.

---
---

# Issue 1: Menu profil crash saat diklik — tombol "Keluar" (logout) tidak pernah muncul

## Ringkasan

Saat user mengklik ikon profil di header aplikasi, seluruh halaman error dengan pesan
**"This page couldn't load"**. Akibatnya dropdown tidak pernah terbuka dan menu
**Keluar** (logout) tidak pernah terlihat.

Ini **bukan** bug di alur logout / Supabase / server action. Ini murni bug **render**:
komponen dropdown melempar exception saat di-mount, lalu error boundary menangkapnya
dan mengganti seluruh halaman dengan tampilan error.

---

## Root cause (sudah dianalisis — jangan dianalisis ulang)

`src/components/app-shell/user-menu.tsx` memakai `DropdownMenuLabel` **langsung** di
dalam `DropdownMenuContent`, tanpa dibungkus `DropdownMenuGroup`.

Di `src/components/ui/dropdown-menu.tsx`, `DropdownMenuLabel` adalah wrapper dari
`Menu.GroupLabel` milik Base UI:

```tsx
// src/components/ui/dropdown-menu.tsx (baris 55-73)
function DropdownMenuLabel({ className, inset, ...props }: MenuPrimitive.GroupLabel.Props & {...}) {
  return <MenuPrimitive.GroupLabel data-slot="dropdown-menu-label" ... />
}
```

Base UI **mewajibkan** `Menu.GroupLabel` berada di dalam `Menu.Group` atau
`Menu.RadioGroup`. Kalau tidak, ia melempar error. Buktinya ada di
`node_modules/@base-ui/react/menu/group-label/MenuGroupLabel.js` baris 29, yang memanggil
`useMenuGroupRootContext()` dari `node_modules/@base-ui/react/menu/group/MenuGroupContext.js`:

```js
function useMenuGroupRootContext() {
  const context = React.useContext(MenuGroupContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.'
    );
  }
  return context;
}
```

Context itu hanya disediakan oleh `Menu.Group` / `Menu.RadioGroup`. Karena `user-menu.tsx`
tidak memakainya, context-nya `undefined` → **throw**.

**Kenapa halamannya baik-baik saja sampai ikon diklik?**
`DropdownMenuContent` dirender lewat `Menu.Portal > Menu.Positioner > Menu.Popup`, yang
hanya di-mount saat menu terbuka. Jadi error baru muncul tepat saat user klik ikon profil.

**Pesan error yang akan terlihat di DevTools Console:**

```
Base UI: MenuGroupContext is missing. Menu group parts must be used within <Menu.Group> or <Menu.RadioGroup>.
```

Kalau pesan ini muncul di console, berarti diagnosis benar dan fix di bawah akan menyelesaikan masalah.

### Referensi resmi

Dokumentasi Base UI yang ter-bundle di repo ini,
`node_modules/@base-ui/react/docs/react/components/menu.md` baris 1325:

> Use the `<Menu.GroupLabel>` part to add a label to a `<Menu.Group>` or `<Menu.RadioGroup>`.

---

## Cakupan kerusakan

Sudah diverifikasi dengan grep: **hanya `user-menu.tsx`** yang memakai `DropdownMenuLabel`.

File lain yang memakai `DropdownMenu` **tidak** terdampak, karena hanya memakai
`DropdownMenuItem` / `DropdownMenuSeparator` / `DropdownMenuTrigger` (tidak butuh `MenuGroupContext`):

- `src/app/(app)/roles/roles-client.tsx`
- `src/app/(app)/users/users-client.tsx`
- `src/app/(app)/sekolah/sekolah-client.tsx`

**Jangan mengubah ketiga file di atas.**

---

## Yang HARUS diperbaiki

### Task 1 — Bungkus `DropdownMenuLabel` dengan `DropdownMenuGroup`

**File:** `src/components/app-shell/user-menu.tsx`

**1a. Tambah `DropdownMenuGroup` ke import.** `DropdownMenuGroup` sudah di-export dari
`src/components/ui/dropdown-menu.tsx`, jadi tidak perlu membuat komponen baru.

Ubah blok import ini:

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

menjadi (tambah satu baris `DropdownMenuGroup`, urut abjad):

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

**1b. Bungkus `DropdownMenuLabel` dengan `DropdownMenuGroup`.**

SEBELUM (sekitar baris 55-63):

```tsx
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          {email ? (
            <p className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </p>
          ) : null}
        </DropdownMenuLabel>
```

SESUDAH:

```tsx
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-1">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {email ? (
              <p className="truncate text-xs font-normal text-muted-foreground">
                {email}
              </p>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
```

Selesai. **Itu saja perubahannya** — dua edit kecil di satu file.

> **Alternatif yang juga diterima** (pilih salah satu, jangan dua-duanya):
> ganti `DropdownMenuLabel ... </DropdownMenuLabel>` dengan `<div className="space-y-1 px-1.5 py-1"> ... </div>`.
> Blok ini memang hanya menampilkan nama + email, bukan label untuk sekelompok item menu.
> **Task 1a/1b di atas adalah opsi yang diutamakan** karena lebih konsisten dengan pola shadcn.

---

## Yang TIDAK BOLEH diubah (penting)

Working tree saat ini punya perubahan yang belum di-commit di 4 file:

- `src/app/(auth)/login/login-form.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/auth-actions.ts`
- `src/components/app-shell/user-menu.tsx`

Perubahan-perubahan itu **sudah benar dan harus dipertahankan**. Khususnya di
`user-menu.tsx`, pola ini memang cara yang didukung Next.js 16 untuk memanggil Server
Action dari event handler:

```tsx
const [isPending, startTransition] = useTransition();

const handleSignOut = () => {
  startTransition(async () => {
    await signOut();
  });
};
```

Dokumentasi Next.js (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md` baris 22)
menyatakan Server Action boleh dipanggil "from an event handler or `useEffect` wrapped in
`startTransition`".

**Larangan:**

- JANGAN kembalikan ke pola `<form action={signOut}>`.
- JANGAN ubah `src/app/auth-actions.ts` (termasuk `redirect("/login?loggedOut=1")` dan `try/catch`-nya).
- JANGAN ubah `src/components/ui/dropdown-menu.tsx` — file itu hasil generate shadcn dan sudah benar.
- JANGAN upgrade/downgrade dependency apa pun. Bug ini bukan masalah versi.
- JANGAN refactor, rename, tambah komentar, atau "merapikan" kode di luar Task 1.
- JANGAN buat file baru selain hasil verifikasi.

---

## Verifikasi (wajib semua lolos)

Jalankan dari root project. Shell di sini `cmd.exe`, jadi **jangan** pakai pipe Unix
seperti `| head`.

1. **Typecheck** — harus bersih, tanpa output error:

   ```
   npx tsc --noEmit
   ```

2. **Lint:**

   ```
   npm run lint
   ```

3. **Build:**

   ```
   npm run build
   ```

   Catatan: build **sudah lolos** sebelum fix ini, jadi build saja tidak membuktikan bug
   hilang. Error ini hanya muncul saat runtime di browser. Poin 4 wajib dilakukan.

4. **Uji manual di browser (ini verifikasi yang menentukan):**

   ```
   npm run dev
   ```

   - Login ke aplikasi.
   - Klik ikon profil di header kanan atas.
   - **Ekspektasi berhasil:** dropdown terbuka, menampilkan nama, email, badge role, dan
     item merah **Keluar**. Tidak ada layar "This page couldn't load".
   - Buka DevTools Console: **tidak boleh** ada `Base UI: MenuGroupContext is missing`.
   - Klik **Keluar** → harus ter-redirect ke `/login?loggedOut=1` dan muncul banner hijau
     "Anda telah keluar."
   - **Hentikan dev server setelah selesai** (Ctrl+C). Jangan biarkan port terpakai.

---

## Acceptance criteria

- [ ] Klik ikon profil membuka dropdown tanpa error.
- [ ] Nama, email, dan badge role tampil di dalam dropdown.
- [ ] Item **Keluar** tampil dan bisa diklik.
- [ ] Klik **Keluar** me-logout user dan redirect ke `/login?loggedOut=1`.
- [ ] Tidak ada `Base UI: MenuGroupContext is missing` di console.
- [ ] `npx tsc --noEmit`, `npm run lint`, dan `npm run build` semuanya lolos.
- [ ] Diff hanya menyentuh `src/components/app-shell/user-menu.tsx`.

---

## Catatan konteks tech stack

- Next.js **16.3.5** (App Router, Turbopack) — ini bukan Next.js versi lama; baca docs di
  `node_modules/next/dist/docs/` sebelum mengubah hal di luar scope.
- React 19.2.8, Base UI `@base-ui/react` 1.8.0 (bukan Radix), Tailwind v4, shadcn.
- Komponen UI di `src/components/ui/` memakai prop `render={<Elem />}` (pola Base UI),
  bukan `asChild` (pola Radix). Jangan campur keduanya.

---
---

# Issue 2: Admin sekolah tambah user — "User dibuat, tetapi role gagal diberikan" dan user baru tidak muncul di daftar

## Gejala

Saat login sebagai **Administrator Sekolah** (bukan super admin) lalu menambah user baru
di halaman `/users`:

1. Muncul toast error **"User dibuat, tetapi role gagal diberikan."**
2. User yang baru dibuat **tidak muncul** di daftar user milik admin sekolah tersebut.
3. User yang sama **muncul** di daftar user milik **super admin**, pada kolom "Sekolah"
   tertulis **"Platform"** (artinya `school_id`-nya `NULL`).

Ketiganya adalah **satu bug yang sama**, bukan tiga bug terpisah. Akunnya sendiri
sebenarnya terbuat di Supabase Auth — jadi setiap percobaan menambah user meninggalkan
satu akun "yatim" yang harus dibersihkan (lihat Task 2).

**Super admin tidak pernah terkena bug ini.** Hanya admin sekolah.

---

## Bukti dari database (hasil inspeksi langsung, bukan tebakan)

> Nilai email, UUID, dan nama sekolah di bawah sudah **disamarkan**. Strukturnya persis
> seperti hasil query aslinya.

Kondisi data saat bug dilaporkan:

```
PROFILES
id                  email                        school_id        is_super_admin
<UUID_SUPER_ADMIN>  super-admin@example.test     <UUID_SEKOLAH_A>  true    <- super admin
<UUID_ADMIN_SEK>    admin-sekolah@example.test   <UUID_SEKOLAH_B>  false   <- admin sekolah B
<UUID_USER_YATIM>   user-baru@example.test       NULL              false   <- USER YATIM (hasil bug)

USER_ROLES  -> hanya 2 baris (untuk super admin & admin sekolah B).
               user-baru@example.test TIDAK punya baris user_roles sama sekali.
```

Admin sekolah `<UUID_ADMIN_SEK>` memegang role `admin_sekolah` (37 permission = semua),
`is_active = true`, sekolahnya `status = 'trial'`, `is_active = true`,
`active_until` masih di masa depan. Semua helper RLS-nya **TRUE**:

```
is_super_admin=false  current_school_id=<UUID_SEKOLAH_B>  access_ok=true
p_users_view=true     p_users_create=true                 p_users_update=true   p_assign_role=true
```

Jadi ini **bukan** masalah permission, **bukan** masalah sekolah suspend/expired, dan
**bukan** masalah role yang kurang hak.

---

## Root cause

### Rantai kejadiannya

Di `src/app/(app)/users/actions.ts`, fungsi `saveUser()` cabang **create**:

1. `admin.auth.admin.createUser(...)` (client **service role**, bypass RLS) membuat baris
   `auth.users`. Trigger `handle_new_user` lalu membuat baris `public.profiles` dengan
   **`school_id = NULL`**.
2. Kode kemudian men-set `school_id` lewat client **RLS** (`supabase`):

   ```ts
   const { error: profileError } = await supabase
     .from("profiles")
     .update({ school_id: targetSchoolId, ... })
     .eq("id", newUserId);
   ```

   **UPDATE ini mencocokkan 0 baris.** PostgREST **tidak** mengembalikan error untuk
   "0 baris ter-update", jadi `profileError` bernilai `null` dan kode lanjut terus
   seolah berhasil. `school_id` tetap `NULL`.
3. Berikutnya `supabase.from("user_roles").insert(...)` dijalankan. Policy
   `user_roles_write` (WITH CHECK) mewajibkan:

   ```sql
   exists (select 1 from public.profiles p
            where p.id = user_id and p.school_id = public.current_school_id())
   ```

   Karena `school_id` masih `NULL`, syarat ini gagal → **RLS violation** →
   `roleError` terisi → toast **"User dibuat, tetapi role gagal diberikan."**
4. Karena `school_id` `NULL`, policy `profiles_select` milik admin sekolah
   (`school_id = current_school_id()`) tidak mencocokkan baris itu → **user tidak muncul**
   di daftar admin sekolah. Super admin lolos lewat cabang `is_super_admin()` → **muncul**,
   dengan label "Platform".

### Kenapa UPDATE-nya mencocokkan 0 baris? (ini inti masalahnya)

Policy `profiles_update` **sudah** punya cabang yang mengizinkan hal ini:

```sql
using (
  public.is_super_admin()
  or id = auth.uid()
  or (school_id = public.current_school_id() and public.has_permission('users.update') and public.current_access_ok())
  or (school_id is null and public.has_permission('users.create') and public.current_access_ok())  -- <-- cabang 4
)
```

Cabang 4 **ternilai TRUE** untuk baris baru itu. Sudah diverifikasi langsung:

```sql
select (null::uuid is null)
       and public.has_permission('users.create')
       and public.current_access_ok();   -- => true
```

**Tetapi PostgreSQL tidak hanya memakai policy UPDATE.** Untuk perintah `UPDATE`/`DELETE`,
PostgreSQL **meng-AND-kan juga policy `SELECT`** dari tabel yang sama, karena perintah itu
harus membaca baris sebelum mengubahnya. Bukti dari `EXPLAIN (VERBOSE)` yang dijalankan
sebagai admin sekolah:

```
Update on public.profiles
  ->  Index Scan using profiles_pkey on public.profiles
        Index Cond: (profiles.id = '<UUID_USER_YATIM>'::uuid)
        Filter: (
            (is_super_admin() OR (profiles.id = auth.uid())
             OR ((profiles.school_id = current_school_id()) AND has_permission('users.update') AND current_access_ok())
             OR ((profiles.school_id IS NULL) AND has_permission('users.create') AND current_access_ok()))
          AND                                                      <-- PERHATIKAN "AND" INI
            (is_super_admin() OR (profiles.id = auth.uid())
             OR ((profiles.school_id = current_school_id()) AND has_permission('users.view') AND current_access_ok()))
        )
```

Bagian kedua adalah policy **`profiles_select`**, dan policy itu **tidak punya cabang
`school_id IS NULL`**. Hasil akhirnya:

> **Cabang 4 pada `profiles_update` adalah kode mati.** Baris profil dengan
> `school_id IS NULL` tidak akan pernah bisa di-update oleh admin sekolah, sehebat apa pun
> permission-nya. UPDATE-nya gagal **dalam diam** (0 baris, tanpa error).

### Verifikasi bahwa fix-nya benar

Sudah diuji di database (dalam transaksi yang di-rollback, tidak ada data berubah):
bila `school_id` di-set memakai **service role**, maka sebagai admin sekolah:

```
insert user_roles (Staf TU)          -> rowCount=1   (sebelumnya: RLS violation)
select profil user baru              -> rowCount=1   (sebelumnya: 0, tak terlihat)
insert user_roles (Administrator)    -> rowCount=1   (anti-eskalasi tetap jalan normal)
```

Juga sudah diverifikasi bahwa di bawah service role `auth.uid()` bernilai **NULL**
(`get_current_user_context()` → `null`), sehingga trigger `protect_profile_privileges()`
melewati seluruh pemeriksaannya dan tidak akan menolak update tersebut.

---

## Perbaikan

### Task 1 — Pakai client service role untuk penugasan profil awal, dan buat kegagalannya terdeteksi

**File:** `src/app/(app)/users/actions.ts`, di dalam `saveUser()`, cabang create
(sekitar baris 278-294).

Baris profil ini baru saja dibuat oleh client service role dan masih "milik platform"
(`school_id NULL`), jadi memang **client service role** yang berhak menugaskannya ke
sebuah sekolah. Nilai `targetSchoolId` untuk admin non-super **sudah** di-hardcode ke
`current.profile.school_id` (bukan dari input form), jadi tidak ada celah seorang admin
sekolah memindahkan user ke sekolah lain.

**SEBELUM:**

```ts
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      school_id: targetSchoolId,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      jabatan: parsed.data.jabatan || null,
      is_active: isActive,
    })
    .eq("id", newUserId);

  if (profileError) {
    await admin.auth.admin.deleteUser(newUserId);
    return {
      error: serverError(profileError, "Gagal menyimpan profil user."),
    };
  }
```

**SESUDAH:**

```ts
  // Baris profil ini baru dibuat oleh service role dan masih ber-school_id NULL,
  // sehingga belum terlihat oleh policy SELECT admin sekolah. Penugasan sekolah
  // harus lewat service role. Nilai targetSchoolId untuk admin non-super sudah
  // di-hardcode ke current.profile.school_id, bukan dari input form.
  const { data: profileRows, error: profileError } = await admin
    .from("profiles")
    .update({
      school_id: targetSchoolId,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      jabatan: parsed.data.jabatan || null,
      is_active: isActive,
    })
    .eq("id", newUserId)
    .select("id, school_id");

  // .select() membuat kegagalan "0 baris ter-update" jadi terlihat. Tanpa ini,
  // PostgREST mengembalikan sukses walau tidak ada baris yang berubah, dan
  // errornya baru muncul jauh setelahnya sebagai "role gagal diberikan"
  // yang menyesatkan.
  if (profileError || profileRows?.length !== 1) {
    await admin.auth.admin.deleteUser(newUserId);
    return {
      error: serverError(
        profileError ??
          new Error(`Profil user ${newUserId} tidak ditemukan setelah dibuat.`),
        "Gagal menyimpan profil user."
      ),
    };
  }
```

Dua perubahan dalam satu edit ini:
- `supabase` → `admin` (memperbaiki bug).
- tambah `.select("id, school_id")` + cek `profileRows?.length !== 1` (supaya bug sejenis
  di masa depan **gagal dengan keras**, bukan diam-diam, dan akun auth-nya ikut dibersihkan
  sehingga tidak menumpuk user yatim).

**Jangan ubah apa pun setelah blok ini.** Blok `user_roles.insert(...)` yang memakai
`supabase` (RLS) **sudah benar** dan harus tetap memakai client RLS — justru itu yang
menegakkan anti-eskalasi `current_user_can_assign_role()`.

---

### Task 2 — Bersihkan data yatim yang sudah terlanjur rusak

Setiap percobaan "Tambah User" yang gagal meninggalkan satu akun **yatim** di Supabase Auth:
`profiles.school_id`-nya `NULL` dan tidak punya baris `user_roles`. Selama dibiarkan, email
akun itu tidak bisa dipakai lagi (akan selalu ditolak dengan "Email sudah terdaftar").

**Langkah 2a — temukan semua akun yatim.** Query ini aman (read-only):

```sql
select id, email, full_name, is_super_admin, created_at
  from public.profiles
 where school_id is null and is_super_admin = false
 order by created_at;
```

Catat `id` dan `email` yang muncul. Itu daftar yang harus dibersihkan.

**Langkah 2b — hapus lewat UI (cara yang diutamakan, tanpa SQL):**

1. Login sebagai **super admin**.
2. Buka `/users`. Akun yatim muncul dengan kolom "Sekolah" = **"Platform"**.
3. Klik ikon ⋯ → **Hapus** untuk tiap akun yatim.

Ini memanggil `admin.auth.admin.deleteUser()`, dan baris `public.profiles` ikut terhapus
lewat foreign key `on delete cascade`.

**Langkah 2c — alternatif SQL, hanya kalau UI tidak bisa dipakai.** Jalankan lewat client
`pg` memakai `DATABASE_URL` dari `.env.local`. **Wajib dibungkus transaksi dan diverifikasi
sebelum commit:**

```sql
begin;

-- 1. pastikan baris yang akan dihapus memang akun yatim
select id, email, school_id from public.profiles
 where school_id is null and is_super_admin = false;

-- 2. ganti <UUID_USER_YATIM> dengan id dari hasil langkah 1.
--    Ulangi untuk tiap akun yatim kalau ada lebih dari satu.
delete from auth.users where id = '<UUID_USER_YATIM>';

-- 3. verifikasi: harus kembali 0 baris
select count(*) from public.profiles
 where school_id is null and is_super_admin = false;

commit;   -- atau rollback; kalau hasil langkah 3 tidak sesuai
```

> **Jangan** menghapus `profiles` yang `is_super_admin = true` — itu akun platform, dan
> `school_id`-nya memang boleh `NULL`.

---

### Task 3 — Uji manual sebagai admin sekolah (ini verifikasi yang menentukan)

`npm run build` **sudah lolos sebelum fix**, jadi build tidak membuktikan apa pun. Bug ini
hanya terlihat saat runtime dengan akun **non-super-admin**.

1. `npm run dev`
2. Login sebagai **Administrator Sekolah** — akun non-super-admin milik salah satu sekolah.
   **Jangan** login sebagai super admin; super admin tidak bisa mereproduksi bug ini.
3. Buka `/users`, klik **Tambah User**.
4. Isi: nama, email baru yang belum pernah dipakai, password (≥ 6 karakter), lalu centang
   satu role (mis. **Staf Tata Usaha**). Klik **Buat User**.
5. **Ekspektasi berhasil:**
   - Toast hijau **"User \<nama\> berhasil dibuat."**
   - **Tidak ada** toast "User dibuat, tetapi role gagal diberikan."
   - User baru **langsung muncul** di daftar, dengan badge role yang tadi dicentang.
   - Terminal dev server **tidak** mencetak `[server-error] new row violates row-level
     security policy for table "user_roles"`.
6. Uji juga **non-super-admin tidak bisa melihat user sekolah lain**: user yang baru dibuat
   tadi **tidak boleh** terlihat kalau login sebagai admin sekolah yang lain.
7. Uji ulang sebagai **super admin**: user baru itu harus muncul dengan kolom "Sekolah"
   berisi nama sekolah yang benar, **bukan** "Platform".
8. Bersihkan user uji coba (Hapus), lalu **hentikan dev server** (Ctrl+C).

---

## Larangan untuk Issue 2 (penting — baca sebelum mengubah apa pun)

- **JANGAN** menambahkan cabang `school_id is null` ke policy `profiles_select`.
  Ini terlihat seperti fix yang paling gampang, tapi **membuka celah lintas tenant**:
  karena `profiles_update` cabang 4 juga mengizinkan `school_id is null`, setiap admin
  sekolah yang punya `users.create` jadi bisa **melihat lalu mengklaim** semua akun
  tanpa sekolah di seluruh platform (termasuk akun yatim dari sekolah lain) ke sekolahnya
  sendiri, lalu memberinya role. Task 1 memperbaiki bug ini tanpa menyentuh RLS.
- **JANGAN** mengubah file migrasi SQL yang sudah ada (`supabase/migrations/0001..0006`)
  atau membuat migrasi baru. Perbaikan Issue 2 murni di lapisan aplikasi.
- **JANGAN** mengganti client RLS (`supabase`) dengan client service role (`admin`) di
  tempat lain — khususnya di blok `user_roles.insert(...)`, `setUserActive()`,
  `deleteUser()`, atau cabang edit (`isEdit`). Itu akan mematikan penegakan
  anti-eskalasi di database.
- **JANGAN** menghapus cabang 4 pada policy `profiles_update` walau sekarang terbukti
  jadi kode mati. Itu pembersihan terpisah, di luar scope issue ini.
- **JANGAN** mengubah `src/lib/supabase/admin.ts`, `src/lib/supabase/server.ts`,
  `src/lib/auth.ts`, atau `src/lib/rbac.ts`.
- **JANGAN** menyentuh `src/components/app-shell/user-menu.tsx` (itu wilayah Issue 1).

---

## Acceptance criteria — Issue 2

- [ ] Admin sekolah bisa membuat user baru **tanpa** pesan "User dibuat, tetapi role gagal diberikan".
- [ ] User baru langsung muncul di daftar `/users` milik admin sekolah, lengkap dengan badge role-nya.
- [ ] Di tampilan super admin, user baru itu menampilkan **nama sekolah**, bukan "Platform".
- [ ] `profiles.school_id` user baru terisi benar di database (bukan `NULL`).
- [ ] Baris `user_roles` untuk user baru terbentuk.
- [ ] Tidak ada akun yatim baru: kalau penyimpanan profil gagal, akun auth-nya ikut terhapus.
- [ ] Admin sekolah **tetap tidak bisa** melihat user dari sekolah lain.
- [ ] Admin sekolah **tetap tidak bisa** memberikan role yang permission-nya melebihi miliknya.
- [ ] Semua akun yatim yang ditemukan di Task 2a sudah dibersihkan.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` semuanya lolos.
- [ ] Diff hanya menyentuh `src/app/(app)/users/actions.ts`.

---

## Catatan untuk reviewer

- Trade-off Task 1: penugasan `school_id` awal sekarang lewat service role (bypass RLS).
  Ini aman karena `targetSchoolId` untuk admin non-super diambil dari
  `current.profile.school_id` (hasil `getCurrentUser()` di server), **tidak pernah** dari
  input form. Input form (`school_id`) hanya dibaca kalau `current.isSuperAdmin` **dan**
  field hidden `school_included` ada — lihat baris 118-119 dan 273-276 di `actions.ts`.
  Jangan mengubah logika itu.
- Bug ini lolos karena PostgREST tidak melaporkan "0 baris ter-update" sebagai error.
  `.select()` + cek jumlah baris di Task 1 adalah penjaga agar kegagalan serupa langsung
  terlihat, bukan muncul sebagai error membingungkan di langkah berikutnya.
