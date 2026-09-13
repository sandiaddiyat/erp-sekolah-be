-- =============================================================================
-- ERP Sekolah - Skema awal: Multi-tenant + RBAC (Role Based Access Control)
-- =============================================================================
-- Model:
--   schools            -> tenant (satu baris = satu sekolah/pesantren)
--   profiles           -> data user aplikasi, 1:1 dengan auth.users
--   roles              -> role milik sekolah (school_id), bisa juga global
--   permissions        -> katalog permission (global, dikelola platform)
--   role_permissions   -> permission apa saja yang dimiliki sebuah role
--   user_roles         -> role apa saja yang dimiliki seorang user
--
-- Semua akses dijaga Row Level Security (RLS). User hanya bisa melihat data
-- sekolahnya sendiri; super admin (pemilik platform) bisa melihat semuanya.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Helper: trigger updated_at
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

-- -----------------------------------------------------------------------------
-- 1. schools (tenant)
-- -----------------------------------------------------------------------------
create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  npsn        text,
  level       text,
  address     text,
  phone       text,
  email       text,
  logo_url    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_schools_updated_at on public.schools;
create trigger trg_schools_updated_at
  before update on public.schools
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 2. profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  school_id       uuid references public.schools(id) on delete set null,
  full_name       text not null default '',
  email           text,
  phone           text,
  avatar_url      text,
  jabatan         text,
  is_active       boolean not null default true,
  is_super_admin  boolean not null default false,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_profiles_school on public.profiles (school_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. permissions (katalog global, dikelola platform)
-- -----------------------------------------------------------------------------
create table if not exists public.permissions (
  id           uuid primary key default gen_random_uuid(),
  module       text not null,
  action       text not null,
  slug         text not null unique,
  name         text not null,
  description  text,
  created_at   timestamptz not null default now(),
  unique (module, action)
);

-- -----------------------------------------------------------------------------
-- 4. roles (milik sekolah)
-- -----------------------------------------------------------------------------
create table if not exists public.roles (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid references public.schools(id) on delete cascade,
  name         text not null,
  slug         text not null,
  description  text,
  is_system    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (school_id, slug)
);

create index if not exists idx_roles_school on public.roles (school_id);

drop trigger if exists trg_roles_updated_at on public.roles;
create trigger trg_roles_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. role_permissions
-- -----------------------------------------------------------------------------
create table if not exists public.role_permissions (
  role_id        uuid not null references public.roles(id) on delete cascade,
  permission_id  uuid not null references public.permissions(id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index if not exists idx_role_permissions_permission on public.role_permissions (permission_id);

-- -----------------------------------------------------------------------------
-- 6. user_roles
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role_id     uuid not null references public.roles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index if not exists idx_user_roles_role on public.user_roles (role_id);

-- =============================================================================
-- FUNGSI BANTU (SECURITY DEFINER -> melewati RLS, mencegah rekursi policy)
-- =============================================================================

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

create or replace function public.has_permission(p_slug text)
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
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and p.slug = p_slug
    )
$$;

create or replace function public.has_role(p_slug text)
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
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.slug = p_slug
    )
$$;

create or replace function public.get_user_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct p.slug), '{}'::text[])
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  where ur.user_id = auth.uid()
$$;

-- =============================================================================
-- TRIGGER: buat profile otomatis saat user auth baru dibuat
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- PROTEKSI: cegah user menaikkan hak akses dirinya sendiri
-- =============================================================================
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() null => konteks service role / SQL editor, izinkan.
  if auth.uid() is not null and not public.is_super_admin() then
    if new.is_super_admin is distinct from old.is_super_admin then
      raise exception 'Hanya super admin yang boleh mengubah status super admin';
    end if;
    if new.school_id is distinct from old.school_id then
      if old.school_id is not null then
        raise exception 'Tidak diizinkan memindahkan user ke sekolah lain';
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

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.schools          enable row level security;
alter table public.profiles         enable row level security;
alter table public.permissions      enable row level security;
alter table public.roles            enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

-- ---------- schools ----------
drop policy if exists schools_select on public.schools;
create policy schools_select on public.schools
  for select to authenticated
  using (public.is_super_admin() or id = public.current_school_id());

drop policy if exists schools_insert on public.schools;
create policy schools_insert on public.schools
  for insert to authenticated
  with check (public.is_super_admin());

drop policy if exists schools_update on public.schools;
create policy schools_update on public.schools
  for update to authenticated
  using (
    public.is_super_admin()
    or (id = public.current_school_id() and public.has_permission('settings.update'))
  )
  with check (
    public.is_super_admin()
    or (id = public.current_school_id() and public.has_permission('settings.update'))
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
    or (school_id = public.current_school_id() and public.has_permission('users.view'))
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
    or (school_id = public.current_school_id() and public.has_permission('users.update'))
    or (school_id is null and public.has_permission('users.create'))
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
    )
  );

-- ---------- permissions (katalog: baca untuk semua, tulis super admin) ----------
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
    or school_id = public.current_school_id()
  );

drop policy if exists roles_insert on public.roles;
create policy roles_insert on public.roles
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (school_id = public.current_school_id() and public.has_permission('roles.create'))
  );

drop policy if exists roles_update on public.roles;
create policy roles_update on public.roles
  for update to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.current_school_id() and public.has_permission('roles.update'))
  )
  with check (
    public.is_super_admin()
    or school_id = public.current_school_id()
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
    )
  );

-- ---------- role_permissions ----------
drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_id
        and (r.school_id is null or r.school_id = public.current_school_id())
    )
  );

drop policy if exists role_permissions_write on public.role_permissions;
create policy role_permissions_write on public.role_permissions
  for all to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_id
        and r.school_id = public.current_school_id()
        and public.has_permission('roles.update')
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_id
        and r.school_id = public.current_school_id()
        and public.has_permission('roles.update')
    )
  );

-- ---------- user_roles ----------
drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
  for select to authenticated
  using (
    public.is_super_admin()
    or user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = user_id and p.school_id = public.current_school_id()
    )
  );

drop policy if exists user_roles_write on public.user_roles;
create policy user_roles_write on public.user_roles
  for all to authenticated
  using (
    public.is_super_admin()
    or (
      public.has_permission('users.assign_role')
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
      and exists (
        select 1 from public.profiles p
        where p.id = user_id and p.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.roles r
        where r.id = role_id
          and (r.school_id is null or r.school_id = public.current_school_id())
      )
    )
  );
