-- Bucket publik untuk foto pegawai + policy storage selevel RLS.
-- Path file: {school_id}/{uuid}.{ext} — folder pertama = school_id.

insert into storage.buckets (id, name, public)
values ('pegawai-photos', 'pegawai-photos', true)
on conflict (id) do nothing;

-- Baca: semua orang boleh melihat foto (bucket public).
drop policy if exists "pegawai-photos read" on storage.objects;
create policy "pegawai-photos read"
on storage.objects for select
using (bucket_id = 'pegawai-photos');

-- Tulis: super admin, atau sekolah sendiri + permission pegawai.create/update.
drop policy if exists "pegawai-photos insert" on storage.objects;
create policy "pegawai-photos insert"
on storage.objects for insert
with check (
  bucket_id = 'pegawai-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and (
        public.has_permission('pegawai.create')
        or public.has_permission('pegawai.update')
      )
    )
  )
);

drop policy if exists "pegawai-photos update" on storage.objects;
create policy "pegawai-photos update"
on storage.objects for update
using (
  bucket_id = 'pegawai-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('pegawai.update')
    )
  )
);

drop policy if exists "pegawai-photos delete" on storage.objects;
create policy "pegawai-photos delete"
on storage.objects for delete
using (
  bucket_id = 'pegawai-photos'
  and (
    public.is_super_admin()
    or (
      (storage.foldername(name))[1] = public.current_school_id()::text
      and public.has_permission('pegawai.delete')
    )
  )
);
