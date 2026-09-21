-- =============================================================================
-- Modul Otomasi Tagihan — Fase 1.2: Skema Biaya
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fee_categories: jenis biaya (SPP, Seragaman, Kegiatan, dll.)
-- -----------------------------------------------------------------------------
create table public.fee_categories (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    name            text      not null,
    billing_cycle   text      not null check (billing_cycle in ('bulanan', 'semester', 'tahunan', 'sekali')),
    description     text,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- fee_structures: nominal per kombinasi jenjang / tingkat / jurusan / tahun ajaran
-- -----------------------------------------------------------------------------
create table public.fee_structures (
    id                  uuid      primary key default gen_random_uuid(),
    school_id           uuid      not null references public.schools(id) on delete cascade,
    academic_year_id    uuid      not null references public.academic_years(id) on delete cascade,
    education_level_id  uuid      not null references public.education_levels(id) on delete cascade,
    grade_id            uuid      not null references public.grades(id) on delete cascade,
    major_id            uuid references public.majors(id) on delete set null,
    fee_category_id     uuid      not null references public.fee_categories(id) on delete cascade,
    amount              numeric(14,2) not null check (amount >= 0),
    due_day             integer check (due_day between 1 and 28),
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

-- Kombinasi unik: satu tahun ajaran + jenjang + tingkat + jurusan + kategori biaya hanya boleh ada sekali
create unique index fee_structures_unique_idx
    on public.fee_structures (academic_year_id, education_level_id, grade_id, coalesce(major_id, '00000000-0000-0000-0000-000000000000'::uuid), fee_category_id);

-- -----------------------------------------------------------------------------
-- Index
-- -----------------------------------------------------------------------------
create index idx_fee_structures_school on public.fee_structures (school_id);
create index idx_fee_structures_year on public.fee_structures (school_id, academic_year_id);
