-- =============================================================================
-- Migrasi 0049: Petakan tagihan manual lama ke invoices
-- =============================================================================
-- Tagihan manual baru akan dibuat langsung sebagai invoice. Tagihan lama
-- dipetakan dengan legacy_bill_id agar UUID invoice tidak berbenturan, sedangkan
-- pembayaran legacy tetap pada bill_id dan tetap dapat ditelusuri/kuitansinya.
-- Tagihan tanpa tahun ajaran yang dapat ditentukan sengaja tidak di-backfill.
-- =============================================================================

alter table public.invoices
  add column if not exists is_manual boolean not null default false,
  add column if not exists legacy_bill_id uuid;

create unique index if not exists invoices_legacy_bill_unique_idx
  on public.invoices (school_id, legacy_bill_id)
  where legacy_bill_id is not null;

alter table public.invoice_details
  alter column fee_structure_id drop not null;

-- Backfill hanya bill dengan tahun ajaran yang bisa ditentukan secara konsisten.
insert into public.invoices (
  school_id,
  student_id,
  academic_year_id,
  period_label,
  issue_date,
  due_date,
  total_amount,
  status,
  is_manual,
  legacy_bill_id,
  created_at,
  updated_at
)
select
  b.school_id,
  b.student_id,
  year_choice.academic_year_id,
  b.deskripsi,
  b.created_at::date,
  coalesce(b.jatuh_tempo, b.created_at::date),
  greatest(0, b.nominal - coalesce(b.diskon, 0)),
  case
    when b.status = 'lunas' then 'lunas'
    when b.status = 'batal' then 'batal'
    when b.status = 'cicilan' then 'sebagian'
    else 'belum_bayar'
  end,
  true,
  b.id,
  b.created_at,
  b.updated_at
from public.bills b
cross join lateral (
  select coalesce(
    (select se.academic_year_id
     from public.student_enrollments se
     where se.student_id = b.student_id and se.school_id = b.school_id
     order by se.created_at desc
     limit 1),
    (select ay.id
     from public.academic_years ay
     where ay.school_id = b.school_id and ay.status = 'active'
     limit 1),
    (select ay.id
     from public.academic_years ay
     where ay.school_id = b.school_id
     order by ay.created_at desc
     limit 1)
  ) as academic_year_id
) year_choice
where year_choice.academic_year_id is not null
  and not exists (
    select 1 from public.invoices i
    where i.school_id = b.school_id and i.legacy_bill_id = b.id
  );

insert into public.invoice_details (
  school_id,
  invoice_id,
  fee_structure_id,
  description,
  base_amount,
  discount_amount,
  final_amount,
  created_at
)
select
  b.school_id,
  i.id,
  b.fee_structure_id,
  b.deskripsi,
  b.nominal,
  coalesce(b.diskon, 0),
  greatest(0, b.nominal - coalesce(b.diskon, 0)),
  b.created_at
from public.invoices i
join public.bills b
  on b.id = i.legacy_bill_id and b.school_id = i.school_id
where i.legacy_bill_id is not null
  and not exists (
    select 1 from public.invoice_details d where d.invoice_id = i.id
  );

-- Pembayaran legacy yang sudah terverifikasi dialokasikan ke invoice hasil backfill.
-- bill_id dipertahankan supaya alur verifikasi/kuitansi lama tetap kompatibel.
insert into public.payment_invoices (
  school_id,
  payment_id,
  invoice_id,
  amount,
  created_at,
  updated_at
)
select
  p.school_id,
  p.id,
  i.id,
  p.nominal,
  p.created_at,
  p.updated_at
from public.payments p
join public.invoices i
  on i.school_id = p.school_id and i.legacy_bill_id = p.bill_id
where p.bill_id is not null
  and p.status = 'terverifikasi'
on conflict (payment_id, invoice_id) do nothing;

create index if not exists idx_invoices_legacy_bill
  on public.invoices (school_id, legacy_bill_id)
  where legacy_bill_id is not null;
