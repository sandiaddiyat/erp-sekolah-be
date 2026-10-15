-- =============================================================================
-- Migrasi 0053: Rollback frekuensi tagih Ganjil/Genap
--
-- Gejala: PR #131 menambahkan Ganjil dan Genap ke katalog frekuensi tagih,
-- padahal kebutuhan aplikasi saat ini hanya memakai empat frekuensi awal.
-- Migrasi ini hanya mengembalikan constraint fee_categories; data master lain
-- dan tabel transaksi tidak diubah.
--
-- Prasyarat: tidak boleh ada baris fee_categories dengan billing_cycle Ganjil
-- atau Genap. Verifikasi sebelum migrasi: select billing_cycle, count(*) from
-- public.fee_categories group by billing_cycle;
-- =============================================================================

alter table public.fee_categories
  drop constraint if exists fee_categories_billing_cycle_check;

alter table public.fee_categories
  add constraint fee_categories_billing_cycle_check
  check (billing_cycle in ('bulanan', 'semester', 'tahunan', 'sekali'));

select constraint_name
from information_schema.table_constraints
where table_schema = 'public'
  and table_name = 'fee_categories'
  and constraint_name = 'fee_categories_billing_cycle_check';
