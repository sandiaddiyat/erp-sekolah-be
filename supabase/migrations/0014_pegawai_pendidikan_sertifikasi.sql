-- =============================================================================
-- Perbaikan Form Pegawai (Issue #21) - Tahap 1
-- =============================================================================
-- 1. Tabel detail anak: pegawai_pendidikan & pegawai_sertifikasi (multi-baris).
-- 2. Drop kolom lama yang digantikan: jurusan_id, jenis_sertifikasi_id,
--    bank_id, no_rekening.
-- 3. Backfill: riwayat pendidikan lama (jurusan_id + pendidikan_terakhir_id)
--    menjadi 1 baris pegawai_pendidikan.
-- Kolom pegawai.jabatan_id dan pegawai.pendidikan_terakhir_id TETAP ada
-- (jabatan utama dari pivot #19; penanda ringkas pendidikan tertinggi).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Riwayat pendidikan: satu pegawai boleh banyak baris
-- -----------------------------------------------------------------------------
create table if not exists public.pegawai_pendidikan (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references public.schools(id) on delete cascade,
  pegawai_id            uuid not null references public.pegawai(id) on delete cascade,
  jenjang_pendidikan_id uuid references public.jenjang_pendidikan(id) on delete set null,
  jurusan               varchar(150),
  nama_institusi        varchar(150),
  tahun_lulus           varchar(4),
  created_at            timestamptz not null default now()
);

create index if not exists idx_pegawai_pendidikan_pegawai
  on public.pegawai_pendidikan (pegawai_id);
create index if not exists idx_pegawai_pendidikan_school
  on public.pegawai_pendidikan (school_id);

-- -----------------------------------------------------------------------------
-- Riwayat sertifikasi: satu pegawai boleh banyak baris
-- -----------------------------------------------------------------------------
create table if not exists public.pegawai_sertifikasi (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools(id) on delete cascade,
  pegawai_id          uuid not null references public.pegawai(id) on delete cascade,
  nama_sertifikasi    varchar(150) not null,
  tanggal_berlaku     date,
  tanggal_kedaluwarsa date,
  nomor_sertifikat    varchar(100),
  penerbit            varchar(150),
  created_at          timestamptz not null default now()
);

create index if not exists idx_pegawai_sertifikasi_pegawai
  on public.pegawai_sertifikasi (pegawai_id);
create index if not exists idx_pegawai_sertifikasi_school
  on public.pegawai_sertifikasi (school_id);

-- -----------------------------------------------------------------------------
-- Kolom urutan untuk ranking jenjang (dipakai backfill pendidikan_terakhir_id):
-- SD=1, SMP=2, SMA/SMK=3, D1..D4=4..7, S1=8, S2=9, S3=10
-- -----------------------------------------------------------------------------
alter table public.jenjang_pendidikan add column if not exists urutan integer;

update public.jenjang_pendidikan j
set urutan = m.urutan
from (values
  ('SD', 1),
  ('SMP', 2),
  ('SMA/SMK', 3),
  ('D1', 4),
  ('D2', 5),
  ('D3', 6),
  ('D4', 7),
  ('S1', 8),
  ('S2', 9),
  ('S3', 10)
) as m(nama_jenjang, urutan)
where j.nama_jenjang = m.nama_jenjang and j.urutan is distinct from m.urutan;

-- -----------------------------------------------------------------------------
-- RLS: pola sama dengan pegawai (0009_pegawai.sql), permission pegawai.*
-- yang sudah ada di katalog (0002_seed_rbac.sql) - tidak ada seed baru.
-- -----------------------------------------------------------------------------
alter table public.pegawai_pendidikan enable row level security;
alter table public.pegawai_sertifikasi enable row level security;

drop policy if exists pegawai_pendidikan_select on public.pegawai_pendidikan;
create policy pegawai_pendidikan_select on public.pegawai_pendidikan
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_pendidikan_insert on public.pegawai_pendidikan;
create policy pegawai_pendidikan_insert on public.pegawai_pendidikan
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.create')));

drop policy if exists pegawai_pendidikan_update on public.pegawai_pendidikan;
create policy pegawai_pendidikan_update on public.pegawai_pendidikan
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.update')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_pendidikan_delete on public.pegawai_pendidikan;
create policy pegawai_pendidikan_delete on public.pegawai_pendidikan
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.delete')));

drop policy if exists pegawai_sertifikasi_select on public.pegawai_sertifikasi;
create policy pegawai_sertifikasi_select on public.pegawai_sertifikasi
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_sertifikasi_insert on public.pegawai_sertifikasi;
create policy pegawai_sertifikasi_insert on public.pegawai_sertifikasi
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.create')));

drop policy if exists pegawai_sertifikasi_update on public.pegawai_sertifikasi;
create policy pegawai_sertifikasi_update on public.pegawai_sertifikasi
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.update')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_sertifikasi_delete on public.pegawai_sertifikasi;
create policy pegawai_sertifikasi_delete on public.pegawai_sertifikasi
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('pegawai.delete')));

-- -----------------------------------------------------------------------------
-- Backfill: riwayat pendidikan lama -> 1 baris pegawai_pendidikan
-- (jenjang dari pendidikan_terakhir_id, jurusan dari nama jurusan lama)
-- -----------------------------------------------------------------------------
insert into public.pegawai_pendidikan (school_id, pegawai_id, jenjang_pendidikan_id, jurusan)
select p.school_id, p.id, p.pendidikan_terakhir_id, j.nama_jurusan
from public.pegawai p
left join public.jurusan j on j.id = p.jurusan_id
where p.jurusan_id is not null or p.pendidikan_terakhir_id is not null;

-- -----------------------------------------------------------------------------
-- Backfill pendidikan_terakhir_id dari jenjang tertinggi (urutan terbesar)
-- -----------------------------------------------------------------------------
update public.pegawai p
set pendidikan_terakhir_id = tertinggi.jenjang_id
from (
  select pp.pegawai_id, max_by_rank.jenjang_id
  from public.pegawai_pendidikan pp
  join lateral (
    select pp2.jenjang_pendidikan_id as jenjang_id
    from public.pegawai_pendidikan pp2
    left join public.jenjang_pendidikan jp on jp.id = pp2.jenjang_pendidikan_id
    where pp2.pegawai_id = pp.pegawai_id and pp2.jenjang_pendidikan_id is not null
    order by coalesce(jp.urutan, 0) desc
    limit 1
  ) max_by_rank on true
  group by pp.pegawai_id, max_by_rank.jenjang_id
) tertinggi
where p.id = tertinggi.pegawai_id;

-- -----------------------------------------------------------------------------
-- Drop kolom lama yang digantikan tabel detail / tidak dibutuhkan
-- -----------------------------------------------------------------------------
alter table public.pegawai drop column if exists jurusan_id;
alter table public.pegawai drop column if exists jenis_sertifikasi_id;
alter table public.pegawai drop column if exists bank_id;
alter table public.pegawai drop column if exists no_rekening;
