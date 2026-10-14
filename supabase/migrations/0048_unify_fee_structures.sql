-- =============================================================================
-- Migrasi 0048: Unifikasi Jenis Tagihan Manual ke Skema Biaya (fee_structures)
-- =============================================================================
-- Menghapus redundansi antara modul "Jenis Tagihan" (bill_items) dan
-- "Skema Biaya" (fee_structures). Kolom baru `fee_structure_id` pada tabel
-- `bills` memungkinkan tagihan manual merujuk langsung ke skema biaya,
-- sehingga katalog lama (bill_items) tidak lagi diperlukan untuk tagihan baru.
--
-- Data historis tetap aman: kolom bill_item_id tetap ada (nullable) hingga
-- migrasi/kebersihan data lebih lanjut.
-- =============================================================================

-- 1. Tambahkan kolom fee_structure_id pada tabel bills
alter table public.bills
  add column if not exists fee_structure_id uuid references public.fee_structures(id) on delete set null;

-- 2. Foreign key tenant-isolated untuk fee_structure_id
alter table public.bills drop constraint if exists bills_fee_structure_tenant_fkey;
alter table public.bills
  add constraint bills_fee_structure_tenant_fkey
  foreign key (fee_structure_id, school_id) references public.fee_structures (id, school_id) on delete set null;

-- 3. Tambahkan index untuk pencarian dan filter
create index if not exists idx_bills_fee_structure on public.bills (school_id, fee_structure_id);

-- 4. Jadikan kolom bill_item_id nullable (jika belum) agar tidak membatasi record baru
alter table public.bills
  alter column bill_item_id drop not null;
