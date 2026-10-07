-- Storage logo sekolah per tenant.
-- Path file: {school_id}/{uuid}.{ext}.
-- Bucket publik agar logo dapat ditampilkan pada kuitansi dan halaman publik.

insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;

drop policy if exists "school-logos read" on storage.objects;
create policy "school-logos read"
on storage.objects for select
using (bucket_id = 'school-logos');

drop policy if exists "school-logos insert" on storage.objects;
create policy "school-logos insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'school-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('schools.update')
    )
  )
);

drop policy if exists "school-logos update" on storage.objects;
create policy "school-logos update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'school-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('schools.update')
    )
  )
)
with check (
  bucket_id = 'school-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('schools.update')
    )
  )
);

drop policy if exists "school-logos delete" on storage.objects;
create policy "school-logos delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'school-logos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('schools.update')
    )
  )
);
