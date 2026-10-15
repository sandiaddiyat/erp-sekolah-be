-- =============================================================================
-- Migrasi 0052: Tambah tanggal jatuh tempo kalender untuk biaya non-bulanan
--
-- Gejala: fee_structures hanya menyimpan due_day sehingga kategori semester,
-- tahunan, ganjil, genap, dan sekali tidak dapat menyimpan tanggal spesifik.
-- Migrasi ini hanya menambah kolom nullable; due_day untuk biaya bulanan tetap
-- dipertahankan dan tidak ada perubahan data existing.
--
-- Alternatif manual: alter table public.fee_structures add column if not exists
-- due_date date;
-- =============================================================================

alter table public.fee_structures
  add column if not exists due_date date;

comment on column public.fee_structures.due_date is
  'Tanggal kalender spesifik jatuh tempo untuk kategori biaya non-bulanan.';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'fee_structures'
  and column_name = 'due_date';
