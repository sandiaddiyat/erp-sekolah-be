-- =============================================================================
-- Issue #116: permission khusus untuk persetujuan diskon siswa
-- =============================================================================

insert into public.permissions (module, action, slug, name, description)
values (
  'discount',
  'approve',
  'discount.approve',
  'Setujui Diskon',
  'Menyetujui atau menolak pengajuan diskon siswa'
)
on conflict (slug) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug in ('admin_sekolah', 'bendahara')
  and p.slug = 'discount.approve'
on conflict (role_id, permission_id) do nothing;

create or replace function public.protect_student_discount_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() and not public.has_permission('discount.approve') then
    if new.status is distinct from old.status
       and new.status <> 'pending' then
      raise exception 'Hanya approver yang boleh mengubah keputusan diskon';
    end if;
    if (new.approved_by is distinct from old.approved_by
        or new.approved_at is distinct from old.approved_at)
       and not (new.status = 'pending' and new.approved_by is null and new.approved_at is null) then
      raise exception 'Hanya approver yang boleh mengubah audit diskon';
    end if;
    if new.status = 'pending' and (new.approved_by is not null or new.approved_at is not null) then
      raise exception 'Pengajuan pending tidak boleh memiliki audit persetujuan';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_student_discount_approval on public.student_discounts;
create trigger protect_student_discount_approval
before update on public.student_discounts
for each row execute function public.protect_student_discount_approval();

create policy student_discounts_approval_select on public.student_discounts
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('discount.approve')
    )
  );

create policy student_discounts_approval_update on public.student_discounts
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('discount.approve')
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('discount.approve')
    )
  );
