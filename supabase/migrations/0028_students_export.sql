-- =============================================================================
-- Permission baru: students.export (unduh data siswa)
-- =============================================================================

insert into public.permissions (module, action, slug, name, description)
select v.module, v.action, v.module || '.' || v.action, v.name, v.description
from (
  values
    ('students', 'export', 'Unduh Data Siswa', 'Mengunduh data siswa dalam file Excel')
) as v(module, action, name, description)
on conflict (slug) do nothing;

-- Berikan permission ke role admin_sekolah yang sudah ada
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
    where p.slug = 'students.export'
    on conflict do nothing;
  end loop;
end $$;
