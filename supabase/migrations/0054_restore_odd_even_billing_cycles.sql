-- =============================================================================
-- Migrasi 0054: Kembalikan frekuensi tagih Ganjil/Genap
--
-- PR #134 mengembalikan constraint ke empat frekuensi awal, tetapi kebutuhan
-- aplikasi tetap memerlukan Ganjil dan Genap seperti PR #131. Migrasi ini
-- mengembalikan kedua nilai tersebut tanpa mengubah data transaksi atau master.
-- =============================================================================

alter table public.fee_categories
  drop constraint if exists fee_categories_billing_cycle_check;

alter table public.fee_categories
  add constraint fee_categories_billing_cycle_check
  check (billing_cycle in ('bulanan', 'semester', 'tahunan', 'sekali', 'ganjil', 'genap'));

select constraint_name
from information_schema.table_constraints
where table_schema = 'public'
  and table_name = 'fee_categories'
  and constraint_name = 'fee_categories_billing_cycle_check';
