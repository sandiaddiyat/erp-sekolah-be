-- =============================================================================
-- Modul Pegawai (Issue #13) - Tahap 2: Master Per-Tenant + Permission
-- =============================================================================
-- Tabel referensi milik tiap sekolah (wajib school_id). RLS pola sama dengan
-- tabel roles: baca untuk anggota sekolah, tulis hanya dengan permission
-- master.manage (atau super admin).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Status Kepegawaian (PNS, PPPK, GTY, GTT, Honorer, Kontrak)
-- -----------------------------------------------------------------------------
create table if not exists public.status_kepegawaian (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  nama_status varchar(100) not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists uq_status_kepegawaian_tenant on public.status_kepegawaian (school_id, nama_status);

-- -----------------------------------------------------------------------------
-- Jabatan (struktural / fungsional)
-- -----------------------------------------------------------------------------
create table if not exists public.jabatan (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  nama_jabatan varchar(100) not null,
  kategori     text not null default 'fungsional' check (kategori in ('struktural','fungsional')),
  created_at   timestamptz not null default now()
);

create unique index if not exists uq_jabatan_tenant on public.jabatan (school_id, nama_jabatan);

-- -----------------------------------------------------------------------------
-- Golongan (III/a, III/b, dst)
-- -----------------------------------------------------------------------------
create table if not exists public.golongan (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  kode_golongan  varchar(20) not null,
  keterangan     varchar(150),
  created_at     timestamptz not null default now()
);

create index if not exists idx_golongan_school on public.golongan (school_id);

-- -----------------------------------------------------------------------------
-- Unit Kerja (bertingkat via parent_unit_id)
-- -----------------------------------------------------------------------------
create table if not exists public.unit_kerja (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  nama_unit      varchar(150) not null,
  parent_unit_id uuid references public.unit_kerja(id) on delete set null,
  created_at     timestamptz not null default now()
);

create unique index if not exists uq_unit_kerja_tenant on public.unit_kerja (school_id, nama_unit);
create index if not exists idx_unit_kerja_parent on public.unit_kerja (parent_unit_id);

-- -----------------------------------------------------------------------------
-- Mata Pelajaran
-- -----------------------------------------------------------------------------
create table if not exists public.mapel (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  nama_mapel varchar(150) not null,
  kode_mapel varchar(30) not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_mapel_tenant on public.mapel (school_id, kode_mapel);

-- -----------------------------------------------------------------------------
-- Jurusan (bisa global bila school_id null)
-- -----------------------------------------------------------------------------
create table if not exists public.jurusan (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete cascade,
  nama_jurusan  varchar(150) not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_jurusan_school on public.jurusan (school_id);

-- -----------------------------------------------------------------------------
-- Jenis Sertifikasi
-- -----------------------------------------------------------------------------
create table if not exists public.jenis_sertifikasi (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  nama_sertifikasi varchar(150) not null,
  created_at       timestamptz not null default now()
);

create index if not exists idx_jenis_sertifikasi_school on public.jenis_sertifikasi (school_id);

-- -----------------------------------------------------------------------------
-- Jenis Cuti / Izin
-- -----------------------------------------------------------------------------
create table if not exists public.jenis_cuti_izin (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  nama_jenis varchar(100) not null,
  kuota_hari integer check (kuota_hari is null or kuota_hari >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_jenis_cuti_izin_school on public.jenis_cuti_izin (school_id);
create unique index if not exists uq_jenis_cuti_izin_tenant on public.jenis_cuti_izin (school_id, nama_jenis);

-- -----------------------------------------------------------------------------
-- Tahun Ajaran
-- -----------------------------------------------------------------------------
create table if not exists public.tahun_ajaran (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references public.schools(id) on delete cascade,
  nama_tahun_ajaran varchar(20) not null,
  semester          text not null check (semester in ('ganjil','genap')),
  tanggal_mulai     date,
  tanggal_selesai   date,
  status_aktif      boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists idx_tahun_ajaran_school on public.tahun_ajaran (school_id);

-- =============================================================================
-- RLS: pola sama dengan tabel roles
-- =============================================================================
alter table public.status_kepegawaian enable row level security;
alter table public.jabatan enable row level security;
alter table public.golongan enable row level security;
alter table public.unit_kerja enable row level security;
alter table public.mapel enable row level security;
alter table public.jurusan enable row level security;
alter table public.jenis_sertifikasi enable row level security;
alter table public.jenis_cuti_izin enable row level security;
alter table public.tahun_ajaran enable row level security;

create policy master_tenant_select on public.status_kepegawaian
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.status_kepegawaian
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.status_kepegawaian
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.status_kepegawaian
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.jabatan
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.jabatan
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.jabatan
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.jabatan
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.golongan
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.golongan
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.golongan
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.golongan
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.unit_kerja
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.unit_kerja
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.unit_kerja
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.unit_kerja
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.mapel
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.mapel
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.mapel
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.mapel
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

-- jurusan bisa global (school_id null terlihat semua anggota sekolah mana pun)
create policy master_tenant_select on public.jurusan
  for select to authenticated
  using (public.is_super_admin() or school_id is null or school_id = public.current_school_id());
create policy master_tenant_insert on public.jurusan
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.jurusan
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.jurusan
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.jenis_sertifikasi
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.jenis_sertifikasi
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.jenis_sertifikasi
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.jenis_sertifikasi
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.jenis_cuti_izin
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.jenis_cuti_izin
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.jenis_cuti_izin
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.jenis_cuti_izin
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

create policy master_tenant_select on public.tahun_ajaran
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_insert on public.tahun_ajaran
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));
create policy master_tenant_update on public.tahun_ajaran
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());
create policy master_tenant_delete on public.tahun_ajaran
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('master.manage')));

-- =============================================================================
-- Permission baru: master & pegawai
-- =============================================================================
insert into public.permissions (module, action, slug, name, description)
select v.module, v.action, v.module || '.' || v.action, v.name, v.description
from (
  values
    ('master',  'view',   'Lihat Master Data',   'Melihat data master (jabatan, mapel, dll)'),
    ('master',  'manage', 'Kelola Master Data',  'Mengelola data master sekolah'),
    ('pegawai', 'view',   'Lihat Pegawai',       'Melihat data pegawai'),
    ('pegawai', 'create', 'Tambah Pegawai',      'Menambah data pegawai'),
    ('pegawai', 'update', 'Ubah Pegawai',        'Mengubah data pegawai'),
    ('pegawai', 'delete', 'Hapus Pegawai',       'Menghapus data pegawai')
) as v(module, action, name, description)
on conflict (slug) do nothing;

-- Berikan permission baru ke role admin_sekolah yang sudah ada
-- (sekolah baru otomatis dapat semua via create_default_roles).
do $$
declare
  v_role_id uuid;
begin
  for v_role_id in
    select r.id from public.roles r where r.slug = 'admin_sekolah'
  loop
    insert into public.role_permissions (role_id, permission_id)
    select v_role_id, p.id from public.permissions p
    where p.slug in ('master.view','master.manage','pegawai.view','pegawai.create','pegawai.update','pegawai.delete')
    on conflict do nothing;
  end loop;
end $$;

-- =============================================================================
-- Auto-seed default master saat sekolah baru dibuat (trigger after insert)
-- =============================================================================
create or replace function public.seed_school_master_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Status kepegawaian standar
  insert into public.status_kepegawaian (school_id, nama_status)
  select new.id, v from (
    values ('PNS'),('PPPK'),('GTY'),('GTT'),('Honorer'),('Kontrak')
  ) as t(v)
  on conflict (school_id, nama_status) do nothing;

  -- Jenis cuti/izin standar
  insert into public.jenis_cuti_izin (school_id, nama_jenis, kuota_hari)
  select new.id, v.nama, v.kuota from (
    values ('Cuti Tahunan', 12), ('Cuti Sakit', null::integer), ('Izin', null::integer), ('Cuti Melahirkan', 90)
  ) as v(nama, kuota)
  on conflict do nothing;

  -- Jabatan standar
  insert into public.jabatan (school_id, nama_jabatan, kategori)
  select new.id, v.nama, v.kategori from (
    values ('Kepala Sekolah', 'struktural'), ('Guru', 'fungsional'), ('Staf Tata Usaha', 'fungsional')
  ) as v(nama, kategori)
  on conflict (school_id, nama_jabatan) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_schools_seed_master on public.schools;
create trigger trg_schools_seed_master
  after insert on public.schools
  for each row execute function public.seed_school_master_defaults();
