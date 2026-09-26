-- Izinkan admin sekolah mengelola profil sekolahnya sendiri (issue #74).
--
-- Sebelumnya policy schools_update hanya menerima `settings.update`, padahal
-- modul "Profil Sekolah" punya permission khusus `schools.update` (lihat tabel
-- `permissions`). Akibatnya admin sekolah tidak bisa menyimpan data profilnya
-- sendiri meski RLS sebenarnya sudah mengizinkan update baris sekolahnya.
--
-- Policy ini menerima salah satu dari keduanya. Kolom sensitif (status,
-- active_until, is_active, slug) tetap dilindungi trigger
-- protect_school_privileges() yang hanya bisa diubah super admin.
drop policy if exists schools_update on public.schools;
create policy schools_update on public.schools
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      id = public.current_school_id()
      and (
        public.has_permission('schools.update')
        or public.has_permission('settings.update')
      )
      and public.current_access_ok()
    )
  )
  with check (
    public.is_super_admin()
    or (
      id = public.current_school_id()
      and (
        public.has_permission('schools.update')
        or public.has_permission('settings.update')
      )
      and public.current_access_ok()
    )
  );
