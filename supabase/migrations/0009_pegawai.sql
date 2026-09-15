-- =============================================================================
-- Modul Pegawai (Issue #13) - Tahap 3: Tabel Pegawai
-- =============================================================================
-- Data kepegawaian sekolah. Pegawai TIDAK otomatis punya akun login; kolom
-- user_id nullable menghubungkan pegawai ke akun profiles yang sudah dibuat
-- lewat menu Users.
-- =============================================================================

create table if not exists public.pegawai (
  id                        uuid primary key default gen_random_uuid(),
  school_id                 uuid not null references public.schools(id) on delete cascade,
  user_id                   uuid references public.profiles(id) on delete set null,
  nip                       varchar(30),
  niy                       varchar(30),
  nuptk                     varchar(30),
  full_name                 varchar(150) not null,
  jenis_kelamin             text check (jenis_kelamin in ('L','P')),
  tempat_lahir              varchar(100),
  tanggal_lahir             date,
  agama_id                  uuid references public.agama(id) on delete set null,
  status_kepegawaian_id     uuid references public.status_kepegawaian(id) on delete set null,
  jabatan_id                uuid references public.jabatan(id) on delete set null,
  golongan_id               uuid references public.golongan(id) on delete set null,
  unit_kerja_id             uuid references public.unit_kerja(id) on delete set null,
  pendidikan_terakhir_id    uuid references public.jenjang_pendidikan(id) on delete set null,
  jurusan_id                uuid references public.jurusan(id) on delete set null,
  jenis_sertifikasi_id      uuid references public.jenis_sertifikasi(id) on delete set null,
  tahun_masuk               date,
  alamat                    text,
  phone                     varchar(30),
  email                     varchar(150),
  bank_id                   uuid references public.bank(id) on delete set null,
  no_rekening               varchar(50),
  is_active                 boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  unique (school_id, nip)
);

create index if not exists idx_pegawai_school on public.pegawai (school_id);
create index if not exists idx_pegawai_user on public.pegawai (user_id);
create index if not exists idx_pegawai_nama on public.pegawai (school_id, full_name);

-- -----------------------------------------------------------------------------
-- Trigger updated_at (pola tabel existing)
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_pegawai_updated_at on public.pegawai;
create trigger trg_pegawai_updated_at
  before update on public.pegawai
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS: pola sama dengan master per-tenant, permission pegawai.*
-- -----------------------------------------------------------------------------
alter table public.pegawai enable row level security;

drop policy if exists pegawai_select on public.pegawai;
create policy pegawai_select on public.pegawai
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_insert on public.pegawai;
create policy pegawai_insert on public.pegawai
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.create')));

drop policy if exists pegawai_update on public.pegawai;
create policy pegawai_update on public.pegawai
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.update')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_delete on public.pegawai;
create policy pegawai_delete on public.pegawai
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.delete')));
