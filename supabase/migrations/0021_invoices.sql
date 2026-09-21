-- =============================================================================
-- Modul Otomasi Tagihan — Fase 2.1: Invoice & Billing Run Logs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- invoices: tagihan per siswa per periode
-- -----------------------------------------------------------------------------
create table public.invoices (
    id                  uuid      primary key default gen_random_uuid(),
    school_id           uuid      not null references public.schools(id) on delete cascade,
    student_id          uuid      not null references public.students(id) on delete cascade,
    guardian_id         uuid references public.guardians(id) on delete set null,
    academic_year_id    uuid      not null references public.academic_years(id) on delete cascade,
    period_label        text      not null,
    issue_date          date      not null,
    due_date            date      not null,
    total_amount        numeric(14,2) not null default 0 check (total_amount >= 0),
    status              text      not null default 'belum_bayar' check (status in ('belum_bayar', 'sebagian', 'lunas', 'batal')),
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- invoice_details: rincian per jenis biaya
-- -----------------------------------------------------------------------------
create table public.invoice_details (
    id              uuid      primary key default gen_random_uuid(),
    invoice_id      uuid      not null references public.invoices(id) on delete cascade,
    fee_structure_id uuid     not null references public.fee_structures(id),
    description     text      not null,
    base_amount     numeric(14,2) not null default 0 check (base_amount >= 0),
    discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
    final_amount    numeric(14,2) not null default 0 check (final_amount >= 0),
    created_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- billing_run_logs: log idempotency job
-- -----------------------------------------------------------------------------
create table public.billing_run_logs (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    academic_year_id uuid     not null references public.academic_years(id) on delete cascade,
    period_label    text      not null,
    run_at          timestamp with time zone not null default now(),
    total_invoices_generated integer not null default 0,
    status          text      not null check (status in ('berjalan', 'selesai', 'gagal')),
    error_message   text,
    created_at      timestamp with time zone default now() not null
);

create unique index billing_run_logs_unique_idx
    on public.billing_run_logs (school_id, academic_year_id, period_label);

create index idx_invoices_student on public.invoices (school_id, student_id);
create index idx_invoices_status on public.invoices (school_id, status);
create index idx_invoice_details_invoice on public.invoice_details (invoice_id);
