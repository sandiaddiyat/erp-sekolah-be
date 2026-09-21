-- =============================================================================
-- Tambah permission Jenis Tagihan ke database yang sudah ada
-- =============================================================================

-- 1. Tambah permission baru ke katalog
insert into public.permissions (module, action, slug, name, description)
values
  ('finance', 'bill_item_view', 'finance.bill_item_view', 'Lihat Jenis Tagihan', 'Melihat katalog jenis tagihan'),
  ('finance', 'bill_item_manage', 'finance.bill_item_manage', 'Kelola Jenis Tagihan', 'Menambah dan menghapus jenis tagihan')
on conflict (slug) do nothing;

-- 2. Berikan ke role Bendahara / Keuangan (system role)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.school_id is null
  and r.slug = 'bendahara'
  and p.slug in ('finance.bill_item_view', 'finance.bill_item_manage')
on conflict do nothing;