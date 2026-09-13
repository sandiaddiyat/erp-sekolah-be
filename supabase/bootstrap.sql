-- =============================================================================
-- BOOTSTRAP - Sekolah pertama + super admin pertama
-- =============================================================================
-- JALANKAN FILE INI SETELAH:
--   1. Migration 0001 dan 0002 sudah dijalankan.
--   2. Kamu sudah membuat 1 user di Supabase Dashboard:
--      Authentication > Users > Add user > Create new user
--      (isi email + password, centang "Auto Confirm User")
--
-- GANTI dua nilai di bawah ini sebelum menjalankan script.
-- =============================================================================

do $$
declare
  v_admin_email text := 'admin@sekolah.sch.id';   -- <<< GANTI dengan email user yang tadi dibuat
  v_school_name text := 'Sekolah Contoh';
  v_school_slug text := 'sekolah-contoh';
  v_school_id   uuid;
  v_user_id     uuid;
begin
  -- 1. Buat sekolah (tenant) pertama
  insert into public.schools (name, slug, level, address)
  values (v_school_name, v_school_slug, 'SMA', '-')
  on conflict (slug) do update set name = excluded.name
  returning id into v_school_id;

  -- 2. Buat 4 role default + permission-nya untuk sekolah ini
  perform public.create_default_roles(v_school_id);

  -- 3. Cari user yang tadi dibuat di dashboard
  select id into v_user_id
  from public.profiles
  where email = v_admin_email;

  if v_user_id is null then
    raise exception 'User dengan email % tidak ditemukan. Buat dulu di Authentication > Users.', v_admin_email;
  end if;

  -- 4. Angkat user tersebut menjadi super admin + gabungkan ke sekolah
  update public.profiles
  set
    school_id      = v_school_id,
    is_super_admin = true,
    is_active      = true,
    full_name      = coalesce(nullif(full_name, ''), 'Super Admin')
  where id = v_user_id;

  -- 5. Beri role Administrator Sekolah
  insert into public.user_roles (user_id, role_id)
  select v_user_id, r.id
  from public.roles r
  where r.school_id = v_school_id and r.slug = 'admin_sekolah'
  on conflict do nothing;

  raise notice 'Bootstrap selesai. Super admin: % (sekolah: %)', v_admin_email, v_school_name;
end $$;

-- Verifikasi hasil bootstrap
select
  p.email,
  p.full_name,
  p.is_super_admin,
  s.name as sekolah,
  coalesce(array_agg(r.name) filter (where r.id is not null), '{}') as roles
from public.profiles p
left join public.schools s on s.id = p.school_id
left join public.user_roles ur on ur.user_id = p.id
left join public.roles r on r.id = ur.role_id
group by p.id, p.email, p.full_name, p.is_super_admin, s.name;
