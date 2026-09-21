-- =============================================================================
-- Seed permission baru untuk otomasi tagihan ke database yang sudah ada
-- Migration ini menggantikan manual seed untuk database yang sudah terpasang
-- =============================================================================

insert into public.permissions (module, action, slug, name, description)
values
  ('finance', 'bill_item_view', 'finance.bill_item_view', 'Lihat Jenis Tagihan', 'Melihat katalog jenis tagihan'),
  ('finance', 'bill_item_manage', 'finance.bill_item_manage', 'Kelola Jenis Tagihan', 'Menambah dan menghapus jenis tagihan'),
  ('academics', 'view', 'academics.view', 'Lihat Akademik', 'Melihat data akademik'),
  ('academics', 'manage', 'academics.manage', 'Kelola Akademik', 'Mengelola tahun ajaran, kelas, pendaftaran'),
  ('fee_structure', 'view', 'fee_structure.view', 'Lihat Skema Biaya', 'Melihat skema biaya'),
  ('fee_structure', 'manage', 'fee_structure.manage', 'Kelola Skema Biaya', 'Membuat dan mengelola skema biaya'),
  ('billing', 'view', 'billing.view', 'Lihat Billing', 'Melihat job dan laporan billing otomatis'),
  ('billing', 'manage', 'billing.manage', 'Kelola Billing', 'Menjalankan job billing'),
  ('discount', 'view', 'discount.view', 'Lihat Diskon', 'Melihat daftar diskon & beasiswa'),
  ('discount', 'manage', 'discount.manage', 'Kelola Diskon', 'Mengatur diskon & alur approval')
on conflict (slug) do nothing;

-- Berikan permission ke role Bendahara / Keuangan (system role)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.school_id is null
  and r.slug = 'bendahara'
  and p.slug in (
    'finance.bill_item_view', 'finance.bill_item_manage',
    'fee_structure.view', 'fee_structure.manage',
    'billing.view', 'billing.manage',
    'discount.view', 'discount.manage'
  )
on conflict do nothing;

-- Berikan permission view ke role Kepala Sekolah (system role)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.school_id is null
  and r.slug = 'kepala_sekolah'
  and p.slug in (
    'fee_structure.view',
    'billing.view',
    'discount.view'
  )
on conflict do nothing;
