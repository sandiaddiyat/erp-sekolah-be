-- Bucket publik untuk foto siswa + policy storage selevel RLS tabel students.
-- Path file: {school_id}/{uuid}.{ext} — folder pertama = school_id.

insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

-- Baca: semua orang boleh melihat foto (bucket public).
drop policy if exists "student-photos read" on storage.objects;
create policy "student-photos read"
on storage.objects for select
using (bucket_id = 'student-photos');

-- Tulis: super admin, atau sekolah sendiri + permission students.
drop policy if exists "student-photos insert" on storage.objects;
create policy "student-photos insert"
on storage.objects for insert
with check (
  bucket_id = 'student-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and (
        public.has_permission('students.create')
        or public.has_permission('students.update')
      )
    )
  )
);

drop policy if exists "student-photos update" on storage.objects;
create policy "student-photos update"
on storage.objects for update
using (
  bucket_id = 'student-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('students.update')
    )
  )
);

drop policy if exists "student-photos delete" on storage.objects;
create policy "student-photos delete"
on storage.objects for delete
using (
  bucket_id = 'student-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('students.delete')
    )
  )
);
