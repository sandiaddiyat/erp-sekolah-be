-- =============================================================================
-- Modul Otomasi Tagihan — Fase 1.1: Master Data Akademik
-- =============================================================================

-- -----------------------------------------------------------------------------
-- academic_years: tahun ajaran (draft / active / closed)
-- -----------------------------------------------------------------------------
create table public.academic_years (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    name            text      not null,
    start_date      date      not null,
    end_date        date      not null,
    status          text      not null default 'draft' check (status in ('draft', 'active', 'closed')),
    is_active       boolean   not null default false,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- education_levels: jenjang (TK, SD, SMP, SMA, SMK)
-- -----------------------------------------------------------------------------
create table public.education_levels (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    code            text      not null,
    name            text      not null,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- grades: tingkat per jenjang (mis. Kelas 7 SD, Kelas 1 SMA)
-- -----------------------------------------------------------------------------
create table public.grades (
    id                  uuid      primary key default gen_random_uuid(),
    school_id           uuid      not null references public.schools(id) on delete cascade,
    education_level_id  uuid      not null references public.education_levels(id) on delete cascade,
    name                text      not null,
    sort_order          integer   not null default 0,
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- majors: jurusan (untuk SMA/SMK)
-- -----------------------------------------------------------------------------
create table public.majors (
    id                  uuid      primary key default gen_random_uuid(),
    school_id           uuid      not null references public.schools(id) on delete cascade,
    education_level_id  uuid      not null references public.education_levels(id) on delete cascade,
    name                text      not null,
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- rooms: ruangan
-- -----------------------------------------------------------------------------
create table public.rooms (
    id              uuid      primary key default gen_random_uuid(),
    school_id       uuid      not null references public.schools(id) on delete cascade,
    name            text      not null,
    "type"          text,
    capacity        integer,
    created_at      timestamp with time zone default now() not null,
    updated_at      timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- classes: rombel per tahun ajaran
-- -----------------------------------------------------------------------------
create table public.classes (
    id                  uuid      primary key default gen_random_uuid(),
    school_id           uuid      not null references public.schools(id) on delete cascade,
    academic_year_id    uuid      not null references public.academic_years(id) on delete cascade,
    grade_id            uuid      not null references public.grades(id) on delete cascade,
    major_id            uuid references public.majors(id) on delete set null,
    room_id             uuid references public.rooms(id) on delete set null,
    homeroom_teacher_id uuid references public.pegawai(id) on delete set null,
    name                text      not null,
    capacity            integer,
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

-- -----------------------------------------------------------------------------
-- student_enrollments: penempatan siswa ke kelas / tahun ajaran
-- -----------------------------------------------------------------------------
create table public.student_enrollments (
    id                  uuid      primary key default gen_random_uuid(),
    school_id           uuid      not null references public.schools(id) on delete cascade,
    student_id          uuid      not null references public.students(id) on delete cascade,
    academic_year_id    uuid      not null references public.academic_years(id) on delete cascade,
    class_id            uuid      not null references public.classes(id) on delete cascade,
    enrollment_date     date      not null,
    exit_date           date,
    status              text      not null default 'active' check (status in ('active', 'keluar', 'pindah', 'lulus')),
    created_at          timestamp with time zone default now() not null,
    updated_at          timestamp with time zone default now() not null
);

create unique index student_enrollments_student_year_idx
    on public.student_enrollments (school_id, student_id, academic_year_id);

-- -----------------------------------------------------------------------------
-- Index untuk performa
-- -----------------------------------------------------------------------------
create index idx_classes_academic_year on public.classes (school_id, academic_year_id);
create index idx_student_enrollments_status on public.student_enrollments (school_id, status);
create index idx_grades_level on public.grades (school_id, education_level_id);
