-- =============================================================================
-- Tahap 1: Penyesuaian Skema Database & Types untuk Pembayaran Multi-Tagihan
-- =============================================================================

-- 1. Siapkan foreign key tenant pada payments.
alter table public.payments
  add constraint payments_id_school_id_key unique (id, school_id);

-- 2. Buat tabel pivot payment_invoices (1 payment -> N invoices)
create table if not exists public.payment_invoices (
    id uuid primary key default gen_random_uuid(),
    school_id uuid not null,
    payment_id uuid not null,
    invoice_id uuid not null,
    amount numeric(14,2) not null check (amount > 0),
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null,
    constraint payment_invoices_school_fkey foreign key (school_id) references public.schools(id) on delete cascade,
    constraint payment_invoices_payment_tenant_fkey foreign key (payment_id, school_id) references public.payments(id, school_id) on delete cascade,
    constraint payment_invoices_invoice_tenant_fkey foreign key (invoice_id, school_id) references public.invoices(id, school_id) on delete cascade,
    constraint payment_invoices_payment_invoice_key unique (payment_id, invoice_id)
);

create index if not exists idx_payment_invoices_payment on public.payment_invoices (payment_id);
create index if not exists idx_payment_invoices_invoice on public.payment_invoices (invoice_id);
create index if not exists idx_payment_invoices_school on public.payment_invoices (school_id);

-- 2. Trigger updated_at
drop trigger if exists trg_payment_invoices_updated_at on public.payment_invoices;
create trigger trg_payment_invoices_updated_at
  before update on public.payment_invoices
  for each row execute function public.set_updated_at();

-- 3. RLS Policies
alter table public.payment_invoices enable row level security;

drop policy if exists payment_invoices_select on public.payment_invoices;
create policy payment_invoices_select on public.payment_invoices
  for select to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        public.has_permission('finance.view')
        or public.has_permission('billing.view')
        or public.has_permission('billing.manage')
      )
    )
  );

drop policy if exists payment_invoices_insert on public.payment_invoices;
create policy payment_invoices_insert on public.payment_invoices
  for insert to authenticated
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('billing.manage')
    )
  );

-- 4. Modifikasi tabel payments untuk merelaksasi constraint (invoice_id sekarang opsional untuk multi-payment)
alter table public.payments drop constraint if exists payments_reference_check;
alter table public.payments add constraint payments_reference_check check (
    (bill_id is not null and payment_method_id is null) -- old legacy flow
    or
    (bill_id is null and payment_method_id is not null) -- new flow (invoice_id bisa null karena pakai payment_invoices)
);

-- Migrasi data existing: pindahkan relasi invoice_id di table payments ke payment_invoices
insert into public.payment_invoices (school_id, payment_id, invoice_id, amount, created_at, updated_at)
select school_id, id, invoice_id, nominal, created_at, updated_at
from public.payments
where invoice_id is not null
on conflict do nothing;
