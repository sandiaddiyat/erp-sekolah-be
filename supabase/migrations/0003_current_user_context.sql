-- =============================================================================
-- get_current_user_context()
-- =============================================================================
-- Menggantikan 4 query terpisah (profiles, schools, roles, permissions)
-- menjadi SATU round trip. Ini memangkas ~400ms per navigasi karena sebelumnya
-- keempat query tersebut harus dijalankan secara berurutan.
--
-- SECURITY DEFINER agar bisa membaca lintas tabel tanpa memicu rekursi policy.
-- Aman karena barisnya dibatasi `p.id = auth.uid()`.
-- =============================================================================

create or replace function public.get_current_user_context()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'profile', to_jsonb(p),
    'school', case when s.id is null then null else to_jsonb(s) end,
    'roles', coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug)
                 order by r.name
               )
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = p.id
      ),
      '[]'::jsonb
    ),
    'permissions', coalesce(
      (
        select jsonb_agg(distinct perm.slug)
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions perm on perm.id = rp.permission_id
        where ur.user_id = p.id
      ),
      '[]'::jsonb
    )
  )
  from public.profiles p
  left join public.schools s on s.id = p.school_id
  where p.id = auth.uid()
$$;

grant execute on function public.get_current_user_context() to authenticated;
