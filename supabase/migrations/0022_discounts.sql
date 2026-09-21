-- =============================================================================
-- Modul Otomasi Tagihan — Fase 3.1: Diskon & Beasiswa
-- =============================================================================

-- -----------------------------------------------------------------------------
-- discount_types: jenis potongan (percent / fixed)
-- -----------------------------------------------------------------------------
create table public.discount_types (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    code            text      not null,
    name            text      not null,
    calc_type       text      not null check (calc_type in ('percent', 'fixed')),
    is_system       boolean   not null default false,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- student_discounts: diskon per siswa dengan alur approval
-- -----------------------------------------------------------------------------
create table public.student_discounts (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    student_id      uuid      not null references public.students(id) on delete cascade,
    discount_type_id uuid     not null references public.discount_types(id) on delete cascade,
    value           numeric(14,2) not null check (value >= 0),
    start_date      date      not null,
    end_date        date      not null,
    status          text      not null default 'pending' check (status in ('pending', 'disetujui', 'ditolak', 'berakhir')),
    approved_by     uuid references public.profiles(id) on delete set null,
    approved_at     timestamp with time zone,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

create index idx_student_discounts_student on public.student_discounts (school_id, student_id);
create index idx_student_discounts_status on public.student_discounts (school_id, status);
