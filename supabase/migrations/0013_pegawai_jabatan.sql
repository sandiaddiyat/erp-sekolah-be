-- =============================================================================
-- Multi-Jabatan Pegawai (Issue #19) - Tahap 1: Tabel pivot pegawai <-> jabatan
-- =============================================================================
-- Banyak-ke-banyak pegawai <-> jabatan. Satu jabatan ditandai is_utama = true.
-- Kolom lama pegawai.jabatan_id DIPERTAHANKAN sementara (selalu disinkronkan
-- dengan jabatan utama) supaya pembaca lama (laporan/gaji) tidak rusak.
-- =============================================================================

create table if not exists public.pegawai_jabatan (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  pegawai_id uuid not null references public.pegawai(id) on delete cascade,
  jabatan_id uuid not null references public.jabatan(id) on delete cascade,
  is_utama   boolean not null default false,
  created_at timestamptz not null default now(),

  unique (pegawai_id, jabatan_id)
);

-- Satu jabatan utama per pegawai (partial unique index).
create unique index if not exists idx_pegawai_jabatan_utama
  on public.pegawai_jabatan (pegawai_id) where is_utama;

create index if not exists idx_pegawai_jabatan_pegawai
  on public.pegawai_jabatan (pegawai_id);
create index if not exists idx_pegawai_jabatan_jabatan
  on public.pegawai_jabatan (jabatan_id);

-- -----------------------------------------------------------------------------
-- RLS: pola sama dengan pegawai (0009_pegawai.sql), permission pegawai.*
-- (katalog permission sudah ada sejak 0002_seed_rbac.sql — tidak di-seed ulang)
-- -----------------------------------------------------------------------------
alter table public.pegawai_jabatan enable row level security;

drop policy if exists pegawai_jabatan_select on public.pegawai_jabatan;
create policy pegawai_jabatan_select on public.pegawai_jabatan
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_jabatan_insert on public.pegawai_jabatan;
create policy pegawai_jabatan_insert on public.pegawai_jabatan
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id()
    and public.has_permission('pegawai.create')));

drop policy if exists pegawai_jabatan_update on public.pegawai_jabatan;
create policy pegawai_jabatan_update on public.pegawai_jabatan
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id()
    and public.has_permission('pegawai.update')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists pegawai_jabatan_delete on public.pegawai_jabatan;
create policy pegawai_jabatan_delete on public.pegawai_jabatan
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id()
    and public.has_permission('pegawai.delete')));

-- -----------------------------------------------------------------------------
-- Backfill: pegawai lama yang punya jabatan_id mendapat baris pivot is_utama.
-- -----------------------------------------------------------------------------
insert into public.pegawai_jabatan (school_id, pegawai_id, jabatan_id, is_utama)
select p.school_id, p.id, p.jabatan_id, true
from public.pegawai p
where p.jabatan_id is not null
on conflict do nothing;
