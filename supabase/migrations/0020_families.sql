-- =============================================================================
-- Modul Otomasi Tagihan — Fase 1.3: Data Keluarga & Wali
-- =============================================================================

-- -----------------------------------------------------------------------------
-- families: unit keluarga (satu kode untuk semua anggota keluarga yang sama)
-- -----------------------------------------------------------------------------
create table public.families (
    id          uuid      primary key default gen_random_uuid(),
    school_id   uuid      not null references public.schools(id) on delete cascade,
    family_code text      unique,
    home_address text,
    created_at  timestamp with time zone default now() not null,
    updated_at  timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- guardians: wali murid
-- -----------------------------------------------------------------------------
create table public.guardians (
    id          uuid      primary key default gen_random_uuid(),
    school_id   uuid      not null references public.schools(id) on delete cascade,
    family_id   uuid      not null references public.families(id) on delete cascade,
    name        text      not null,
    relation    text      not null,
    phone       text,
    email       text,
    is_primary_billing_contact boolean default false,
    created_at  timestamp with time zone default now() not null,
    updated_at  timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- Tambahkan family_id ke tabel students yang sudah ada
-- -----------------------------------------------------------------------------
alter table public.students
    add column family_id uuid references public.families(id) on delete set null;

create index idx_guardians_family on public.guardians (school_id, family_id);
create index idx_students_family on public.students (school_id, family_id);
