-- =============================================================================
-- Modul Otomasi Tagihan — Fase 4.1: Payment Methods & Rekonsiliasi
-- =============================================================================

-- -----------------------------------------------------------------------------
-- payment_methods: metode pembayaran (Tunai, Transfer, VA, Gateway)
-- -----------------------------------------------------------------------------
create table public.payment_methods (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    name            text      not null,
    is_cash         boolean   not null default false,
    is_gateway      boolean   not null default false,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- bank_accounts: rekening tujuan pembayaran sekolah
-- -----------------------------------------------------------------------------
create table public.bank_accounts (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    bank_name       text      not null,
    account_number  text      not null,
    account_holder  text      not null,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- Hubungkan payments ke invoices (bukan lagi langsung ke bills)
-- -----------------------------------------------------------------------------
alter table public.payments
    add column invoice_id uuid references public.invoices(id) on delete set null;

create index idx_payments_invoice on public.payments (invoice_id);
