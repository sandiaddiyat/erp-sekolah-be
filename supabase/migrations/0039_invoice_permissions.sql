-- =============================================================================
-- Seed permission Invoice / Tagihan Siswa
--
-- finance.invoice.view & finance.invoice.manage sudah dipakai di src/lib/rbac.ts
-- dan menu sidebar (MAIN_NAV -> /keuangan/invoice), tapi belum pernah
-- di-insert ke tabel public.permissions. Akibatnya:
--   1. Halaman "Role & Hak Akses" tidak menampilkan permission Invoice,
--      karena daftar permission dimuat langsung dari tabel permissions.
--   2. can(user.permissions, 'finance.invoice.view') selalu false sehingga
--      menu Invoice tidak muncul di sidebar dan requirePermission() menolak.
--
-- Migration ini HANYA menambah katalog permission. Tidak ada grant ke
-- role_apapun: assignment dilakukan lewat UI "Role & Hak Akses".
-- Bila ingin memberi akses ke role sistem, jalankan manual:
--
--   insert into public.role_permissions (role_id, permission_id)
--   select r.id, p.id
--   from public.roles r
--   cross join public.permissions p
--   where r.slug in ('bendahara', 'kepala_sekolah')
--     and p.slug in ('finance.invoice.view', 'finance.invoice.manage');
--
-- Catatan: kolom permissions punya unique (module, action), jadi slug baru
-- harus memakai pasangan module/action yang belum terpakai.
-- =============================================================================

insert into public.permissions (module, action, slug, name, description)
values
  ('finance', 'invoice_view', 'finance.invoice.view', 'Lihat Invoice', 'Melihat tagihan siswa'),
  ('finance', 'invoice_manage', 'finance.invoice.manage', 'Kelola Invoice', 'Membuat dan mengelola tagihan siswa')
on conflict (slug) do nothing;

-- Verifikasi: kedua permission harus ada di katalog.
select slug, name
from public.permissions
where slug in ('finance.invoice.view', 'finance.invoice.manage')
order by slug;
