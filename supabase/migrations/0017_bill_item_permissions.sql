-- =============================================================================
-- Tambah permission Jenis Tagihan ke database yang sudah ada
-- =============================================================================

insert into public.permissions (module, action, slug, name, description)
values
  ('finance', 'bill_item_view', 'finance.bill_item_view', 'Lihat Jenis Tagihan', 'Melihat katalog jenis tagihan'),
  ('finance', 'bill_item_manage', 'finance.bill_item_manage', 'Kelola Jenis Tagihan', 'Menambah dan menghapus jenis tagihan')
on conflict (slug) do nothing;
