-- =============================================================================
-- Modul Data Siswa (Issue #15) - Tahap 1: Tabel students
-- =============================================================================
-- Data biodata siswa. siswa TIDAK otomatis punya akun login; kolom
-- user_id nullable menghubungkan siswa ke akun profiles yang sudah dibuat
-- lewat menu Users. Nama tabel `students` diselaraskan dengan modul permission
-- `students.*` yang sudah di-seed sejak migrasi 0002_seed_rbac.sql
-- (pola: nama tabel mencerminkan nama modul permission, sama seperti `pegawai`).
-- =============================================================================

create table if not exists public.students (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  user_id          uuid references public.profiles(id) on delete set null,
  nis              varchar(30),
  nisn             varchar(30),
  nama_lengkap     varchar(150) not null,
  jenis_kelamin    text check (jenis_kelamin in ('L','P')),
  tempat_lahir     varchar(100),
  tanggal_lahir    date,
  agama_id         uuid references public.agama(id) on delete set null,
  alamat           text,
  nama_ayah        varchar(150),
  nama_ibu         varchar(150),
  nama_wali        varchar(150),
  telepon_wali     varchar(30),
  status           text not null default 'aktif' check (status in ('aktif','lulus','pindah','keluar')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (school_id, nis),
  unique (school_id, nisn)
);

create index if not exists idx_students_school on public.students (school_id);
create index if not exists idx_students_user on public.students (user_id);
create index if not exists idx_students_nama on public.students (school_id, nama_lengkap);

-- -----------------------------------------------------------------------------
-- Trigger updated_at (pola tabel existing)
-- -----------------------------------------------------------------------------
drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: pola sama dengan pegawai, permission students.*
-- Note: katalog permission students.{view,create,update,delete,import} sudah
-- ada sejak migrasi 0002_seed_rbac.sql, jadi tidak perlu re-seed di sini.
-- -----------------------------------------------------------------------------
alter table public.students enable row level security;

drop policy if exists students_select on public.students;
create policy students_select on public.students
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists students_insert on public.students;
create policy students_insert on public.students
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('students.create')));

drop policy if exists students_update on public.students;
create policy students_update on public.students
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('students.update')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists students_delete on public.students;
create policy students_delete on public.students
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('students.delete')));
