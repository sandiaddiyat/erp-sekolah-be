-- =============================================================================
-- Modul Pegawai (Issue #13) - Tahap 1: Master Global
-- =============================================================================
-- Tabel referensi global yang dipakai lintas tenant (tanpa school_id):
-- wilayah, agama, bank, jenis_dokumen, jenjang_pendidikan.
-- Data global hanya dikelola lewat seed/migrasi/script, jadi RLS-nya hanya
-- membuka SELECT untuk user yang login.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Wilayah (provinsi/kabupaten/kecamatan/kelurahan, bertingkat)
-- -----------------------------------------------------------------------------
create table if not exists public.wilayah (
  id           uuid primary key default gen_random_uuid(),
  kode_wilayah varchar(20) not null,
  nama_wilayah varchar(150) not null,
  level        text not null check (level in ('provinsi','kabupaten','kecamatan','kelurahan')),
  parent_id    uuid references public.wilayah(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create unique index if not exists uq_wilayah_kode on public.wilayah (kode_wilayah);
create index if not exists idx_wilayah_parent on public.wilayah (parent_id);
create index if not exists idx_wilayah_level on public.wilayah (level);

-- -----------------------------------------------------------------------------
-- Agama
-- -----------------------------------------------------------------------------
create table if not exists public.agama (
  id         uuid primary key default gen_random_uuid(),
  nama_agama varchar(50) not null,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_agama_nama on public.agama (nama_agama);

-- -----------------------------------------------------------------------------
-- Bank
-- -----------------------------------------------------------------------------
create table if not exists public.bank (
  id         uuid primary key default gen_random_uuid(),
  nama_bank  varchar(100) not null,
  kode_bank  varchar(20),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_bank_nama on public.bank (nama_bank);

-- -----------------------------------------------------------------------------
-- Jenis Dokumen (KTP, KK, Ijazah, SK, Sertifikat, NPWP, ...)
-- -----------------------------------------------------------------------------
create table if not exists public.jenis_dokumen (
  id           uuid primary key default gen_random_uuid(),
  nama_dokumen varchar(100) not null,
  wajib_unggah boolean not null default false,
  created_at   timestamptz not null default now()
);

create unique index if not exists uq_jenis_dokumen_nama on public.jenis_dokumen (nama_dokumen);

-- -----------------------------------------------------------------------------
-- Jenjang Pendidikan (SMA, D3, S1, S2, S3, ...)
-- -----------------------------------------------------------------------------
create table if not exists public.jenjang_pendidikan (
  id           uuid primary key default gen_random_uuid(),
  nama_jenjang varchar(50) not null,
  created_at   timestamptz not null default now()
);

create unique index if not exists uq_jenjang_pendidikan_nama on public.jenjang_pendidikan (nama_jenjang);

-- -----------------------------------------------------------------------------
-- Seed data global standar (idempotent)
-- -----------------------------------------------------------------------------
insert into public.agama (nama_agama)
select v from (values ('Islam'),('Kristen'),('Katolik'),('Hindu'),('Buddha'),('Konghucu')) as t(v)
on conflict (nama_agama) do nothing;

insert into public.jenjang_pendidikan (nama_jenjang)
select v from (values ('SD'),('SMP'),('SMA/SMK'),('D1'),('D2'),('D3'),('D4'),('S1'),('S2'),('S3')) as t(v)
on conflict (nama_jenjang) do nothing;

insert into public.jenis_dokumen (nama_dokumen, wajib_unggah)
select v.nama_dokumen, v.wajib_unggah
from (values
  ('KTP', true),
  ('KK', true),
  ('Ijazah', true),
  ('SK', true),
  ('Sertifikat', false),
  ('NPWP', false)
) as v(nama_dokumen, wajib_unggah)
on conflict (nama_dokumen) do nothing;

-- -----------------------------------------------------------------------------
-- RLS: hanya baca untuk user yang login; tulis via seed/migrasi saja
-- -----------------------------------------------------------------------------
alter table public.wilayah enable row level security;
alter table public.agama enable row level security;
alter table public.bank enable row level security;
alter table public.jenis_dokumen enable row level security;
alter table public.jenjang_pendidikan enable row level security;

drop policy if exists wilayah_select on public.wilayah;
create policy wilayah_select on public.wilayah
  for select to authenticated
  using (true);

drop policy if exists agama_select on public.agama;
create policy agama_select on public.agama
  for select to authenticated
  using (true);

drop policy if exists bank_select on public.bank;
create policy bank_select on public.bank
  for select to authenticated
  using (true);

drop policy if exists jenis_dokumen_select on public.jenis_dokumen;
create policy jenis_dokumen_select on public.jenis_dokumen
  for select to authenticated
  using (true);

drop policy if exists jenjang_pendidikan_select on public.jenjang_pendidikan;
create policy jenjang_pendidikan_select on public.jenjang_pendidikan
  for select to authenticated
  using (true);
