alter table public.fee_categories
  drop constraint if exists fee_categories_billing_cycle_check;

alter table public.fee_categories
  add constraint fee_categories_billing_cycle_check
  check (billing_cycle in ('bulanan', 'semester', 'tahunan', 'sekali', 'ganjil', 'genap'));
