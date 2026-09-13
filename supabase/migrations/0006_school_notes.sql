-- =============================================================================
-- Pindahkan schools.notes ke tabel school_notes (khusus super admin)
-- =============================================================================
-- Menutup kebocoran data internal: kolom notes sebelumnya ikut terbaca oleh
-- seluruh anggota sekolah lewat PostgREST (policy schools_select hanya membatasi
-- baris, bukan kolom) dan get_current_user_context() (to_jsonb(s)).
--
-- Karena super admin di aplikasi ini tetap login sebagai role Postgres
-- `authenticated` (tidak ada role Postgres terpisah), kolom notes tidak bisa
-- dilindungi lewat revoke kolom biasa tanpa ikut memblokir super admin. Maka
-- notes dipindah ke tabel terpisah yang RLS-nya hanya terbuka untuk super admin.
-- =============================================================================

create table if not exists public.school_notes (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  note       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_school_notes_school on public.school_notes (school_id);

alter table public.school_notes enable row level security;

drop policy if exists school_notes_select on public.school_notes;
create policy school_notes_select on public.school_notes
  for select to authenticated
  using (public.is_super_admin());

drop policy if exists school_notes_insert on public.school_notes;
create policy school_notes_insert on public.school_notes
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists school_notes_update on public.school_notes;
create policy school_notes_update on public.school_notes
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

drop policy if exists school_notes_delete on public.school_notes;
create policy school_notes_delete on public.school_notes
  for delete to authenticated
  using (public.is_super_admin());

-- -----------------------------------------------------------------------------
-- Recreate trigger proteksi sekolah tanpa referensi kolom notes (akan dihapus).
-- -----------------------------------------------------------------------------
create or replace function public.protect_school_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    if new.status is distinct from old.status
       or new.active_until is distinct from old.active_until
       or new.is_active is distinct from old.is_active
       or new.slug is distinct from old.slug then
      raise exception 'Hanya super admin yang boleh mengubah status, masa aktif, atau slug sekolah';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_schools_protect on public.schools;
create trigger trg_schools_protect
  before update on public.schools
  for each row execute function public.protect_school_privileges();

-- -----------------------------------------------------------------------------
-- Migrasi data lama lalu hapus kolom notes.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'schools'
      and column_name = 'notes'
  ) then
    insert into public.school_notes (school_id, note)
    select id, notes
    from public.schools
    where notes is not null and notes <> '';

    alter table public.schools drop column notes;
  end if;
end $$;
