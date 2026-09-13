-- =============================================================================
-- ERP Sekolah - Security hardening: penegakan akses & anti-eskalasi di database
-- =============================================================================
-- Menutup celah yang sebelumnya hanya dicegah di UI:
--   1. Suspensi/expired sekolah & user nonaktif kini juga diblokir di RLS.
--   2. Pemegang roles.update tidak bisa lagi memberikan permission yang tidak
--      ia miliki (anti privilege escalation).
--   3. Pemegang users.assign_role tidak bisa lagi assign role ke diri sendiri
--      atau memberikan role dengan permission melebihi miliknya.
--   4. Kolom status/langganan/notes sekolah dilindungi trigger (super admin only).
--   5. Kolom is_active profil tidak bisa diubah sendiri oleh user.
--   6. Kolom is_system role dilindungi trigger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Helper status akses (SECURITY DEFINER, dibatasi auth.uid())
-- -----------------------------------------------------------------------------
create or replace function public.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_active from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

create or replace function public.current_school_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (
        s.status <> 'suspended'
        and s.is_active
        and (s.active_until is null or s.active_until >= current_date)
      )
      from public.schools s
      join public.profiles p on p.school_id = s.id
      where p.id = auth.uid()
    ),
    false
  )
$$;

create or replace function public.current_access_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_active() and public.current_school_active()
$$;

-- -----------------------------------------------------------------------------
-- 2. Helper anti-eskalasi
-- -----------------------------------------------------------------------------
-- Benar jika caller sudah memegang permission ini (atau super admin),
-- sehingga ia boleh memberikannya kepada role lain.
create or replace function public.current_user_can_grant_permission(p_permission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = auth.uid()
        and rp.permission_id = p_permission_id
    )
$$;

-- Benar jika seluruh permission role target sudah dimiliki caller,
-- sehingga caller tidak bisa memberikan role yang melebihi wewenangnya.
create or replace function public.current_user_can_assign_role(p_role_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or not exists (
      select 1
      from public.role_permissions rp
      where rp.role_id = p_role_id
        and not exists (
          select 1
          from public.user_roles ur
          join public.role_permissions rp2 on rp2.role_id = ur.role_id
          where ur.user_id = auth.uid()
            and rp2.permission_id = rp.permission_id
        )
    )
$$;

revoke execute on function public.current_user_active() from public, anon;
revoke execute on function public.current_school_active() from public, anon;
revoke execute on function public.current_access_ok() from public, anon;
revoke execute on function public.current_user_can_grant_permission(uuid) from public, anon;
revoke execute on function public.current_user_can_assign_role(uuid) from public, anon;

grant execute on function public.current_user_active() to authenticated;
grant execute on function public.current_school_active() to authenticated;
grant execute on function public.current_access_ok() to authenticated;
grant execute on function public.current_user_can_grant_permission(uuid) to authenticated;
grant execute on function public.current_user_can_assign_role(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Trigger proteksi privilege
-- -----------------------------------------------------------------------------

-- Profil: cegah user menaikkan hak akses dirinya sendiri (super admin,
-- pindah sekolah, atau mengubah is_active miliknya sendiri).
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    if new.is_super_admin is distinct from old.is_super_admin then
      raise exception 'Hanya super admin yang boleh mengubah status super admin';
    end if;

    if new.school_id is distinct from old.school_id then
      if old.school_id is not null then
        raise exception 'Tidak diizinkan memindahkan user ke sekolah lain';
      end if;
    end if;

    if new.is_active is distinct from old.is_active then
      if old.id = auth.uid() then
        raise exception 'Tidak diizinkan mengubah status aktif akun sendiri';
      end if;
      if not public.has_permission('users.update') then
        raise exception 'Tidak diizinkan mengubah status aktif user';
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect on public.profiles;
create trigger trg_profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();

-- Sekolah: kolom status/langganan/notes hanya boleh diubah super admin.
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
       or new.slug is distinct from old.slug
       or new.notes is distinct from old.notes then
      raise exception 'Hanya super admin yang boleh mengubah status, masa aktif, slug, atau catatan sekolah';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_schools_protect on public.schools;
create trigger trg_schools_protect
  before update on public.schools
  for each row execute function public.protect_school_privileges();

-- Role: cegah pemegang roles.update mengubah flag is_system.
create or replace function public.protect_role_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    if new.is_system is distinct from old.is_system then
      raise exception 'Hanya super admin yang boleh mengubah status role sistem';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_roles_protect on public.roles;
create trigger trg_roles_protect
  before update on public.roles
  for each row execute function public.protect_role_privileges();

-- -----------------------------------------------------------------------------
-- 4. RLS hardened (menggantikan policy di 0001)
-- -----------------------------------------------------------------------------

-- ---------- schools ----------
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools
  for select to authenticated
  using (
    public.is_super_admin()
    or (id = public.current_school_id() and public.current_access_ok())
  );

drop policy if exists schools_insert on public.schools;
create policy schools_insert on public.schools
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists schools_update on public.schools;
create policy schools_update on public.schools
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      id = public.current_school_id()
      and public.has_permission('settings.update')
      and public.current_access_ok()
    )
  )
  with check (
    public.is_super_admin()
    or (
      id = public.current_school_id()
      and public.has_permission('settings.update')
      and public.current_access_ok()
    )
  );

drop policy if exists schools_delete on public.schools;
create policy schools_delete on public.schools
  for delete to authenticated
  using (public.is_super_admin());

-- ---------- profiles ----------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or (
      school_id = public.current_school_id()
      and public.has_permission('users.view')
      and public.current_access_ok()
    )
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_super_admin() or id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (
    public.is_super_admin()
    or id = auth.uid()
    or (
      school_id = public.current_school_id()
      and public.has_permission('users.update')
      and public.current_access_ok()
    )
    or (
      school_id is null
      and public.has_permission('users.create')
      and public.current_access_ok()
    )
  )
  with check (
    public.is_super_admin()
    or school_id = public.current_school_id()
  );

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (
    public.is_super_admin()
    or (
      school_id = public.current_school_id()
      and public.has_permission('users.delete')
      and id <> auth.uid()
      and public.current_access_ok()
    )
  );

-- ---------- permissions (katalog: baca semua, tulis super admin) ----------
drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select to authenticated
  using (true);

drop policy if exists permissions_write on public.permissions;
create policy permissions_write on public.permissions
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- ---------- roles ----------
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select to authenticated
  using (
    public.is_super_admin()
    or school_id is null
    or (school_id = public.current_school_id() and public.current_access_ok())
  );

drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      school_id = public.current_school_id()
      and public.has_permission('roles.create')
      and public.current_access_ok()
    )
  );

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      school_id = public.current_school_id()
      and public.has_permission('roles.update')
      and public.current_access_ok()
    )
  )
  with check (
    public.is_super_admin()
    or (school_id = public.current_school_id() and public.current_access_ok())
  );

drop policy if exists roles_delete on public.roles;
create policy roles_delete on public.roles
  for delete to authenticated
  using (
    public.is_super_admin()
    or (
      school_id = public.current_school_id()
      and public.has_permission('roles.delete')
      and is_system = false
      and public.current_access_ok()
    )
  );

-- ---------- role_permissions ----------
drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.roles r
        where r.id = role_id
          and (r.school_id is null or r.school_id = public.current_school_id())
      )
      and public.current_access_ok()
    )
  );

drop policy if exists role_permissions_write on public.role_permissions;
create policy role_permissions_write on public.role_permissions
  for all to authenticated
  using (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.roles r
        where r.id = role_id
          and r.school_id = public.current_school_id()
      )
      and public.has_permission('roles.update')
      and public.current_access_ok()
    )
  )
  with check (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.roles r
        where r.id = role_id
          and r.school_id = public.current_school_id()
      )
      and public.has_permission('roles.update')
      and public.current_access_ok()
      and public.current_user_can_grant_permission(permission_id)
    )
  );

-- ---------- user_roles ----------
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    public.is_super_admin()
    or user_id = auth.uid()
    or (
      exists (
        select 1 from public.profiles p
        where p.id = user_id and p.school_id = public.current_school_id()
      )
      and public.current_access_ok()
    )
  );

drop policy if exists user_roles_write on public.user_roles;
create policy user_roles_write on public.user_roles
  for all to authenticated
  using (
    public.is_super_admin()
    or (
      public.has_permission('users.assign_role')
      and public.current_access_ok()
      and exists (
        select 1 from public.profiles p
        where p.id = user_id and p.school_id = public.current_school_id()
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.has_permission('users.assign_role')
      and public.current_access_ok()
      and user_id <> auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = user_id and p.school_id = public.current_school_id()
      )
      and public.current_user_can_assign_role(role_id)
    )
  );
