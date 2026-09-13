-- =============================================================================
-- Masa aktif / langganan sekolah + fungsi pendaftaran sekolah
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Kolom langganan pada tabel schools
-- -----------------------------------------------------------------------------
-- active_until NULL berarti tanpa batas waktu.
alter table public.schools
  add column if not exists status       text not null default 'active',
  add column if not exists active_until date,
  add column if not exists notes        text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'schools_status_check'
  ) then
    alter table public.schools
      add constraint schools_status_check
      check (status in ('trial', 'active', 'suspended'));
  end if;
end $$;

create index if not exists idx_schools_status on public.schools (status);

-- -----------------------------------------------------------------------------
-- 2. Fungsi pendaftaran sekolah (khusus super admin)
-- -----------------------------------------------------------------------------
-- Dibuat SECURITY DEFINER supaya bisa membuat sekolah + role default dalam satu
-- transaksi, sekaligus jadi satu-satunya pintu masuk yang memeriksa hak akses.
create or replace function public.create_school(
  p_name         text,
  p_slug         text,
  p_npsn         text default null,
  p_level        text default null,
  p_address      text default null,
  p_phone        text default null,
  p_email        text default null,
  p_status       text default 'trial',
  p_active_until date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Hanya super admin yang boleh mendaftarkan sekolah';
  end if;

  if p_status not in ('trial', 'active', 'suspended') then
    raise exception 'Status sekolah tidak dikenal: %', p_status;
  end if;

  insert into public.schools (
    name, slug, npsn, level, address, phone, email, status, active_until, is_active
  )
  values (
    p_name, p_slug, p_npsn, p_level, p_address, p_phone, p_email, p_status, p_active_until,
    (p_status <> 'suspended')
  )
  returning id into v_school_id;

  perform public.create_default_roles(v_school_id);

  return v_school_id;
end;
$$;

grant execute on function public.create_school(
  text, text, text, text, text, text, text, text, date
) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Tutup celah: create_default_roles tidak boleh dipanggil sembarang user
-- -----------------------------------------------------------------------------
-- Fungsi ini SECURITY DEFINER dan menerima school_id sembarang, sehingga tanpa
-- pembatasan seorang admin sekolah bisa membuat role default di sekolah lain.
-- Sekarang hanya bisa dipanggil dari create_school() (yang memeriksa super
-- admin) dan dari skrip bootstrap yang berjalan sebagai owner.
revoke execute on function public.create_default_roles(uuid)
  from public, anon, authenticated;

-- Fungsi pembantu lain tetap aman karena selalu dibatasi auth.uid(),
-- jadi tidak perlu dicabut.
