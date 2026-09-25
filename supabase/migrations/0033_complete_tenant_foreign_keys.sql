-- =============================================================================
-- Melengkapi composite foreign key tenant yang belum tercakup
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    where con.conname = 'grades_education_level_tenant_fkey'
      and child_ns.nspname = 'public'
      and child.relname = 'grades'
  ) then
    alter table public.grades
      add constraint grades_education_level_tenant_fkey
      foreign key (education_level_id, school_id)
      references public.education_levels (id, school_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    where con.conname = 'majors_education_level_tenant_fkey'
      and child_ns.nspname = 'public'
      and child.relname = 'majors'
  ) then
    alter table public.majors
      add constraint majors_education_level_tenant_fkey
      foreign key (education_level_id, school_id)
      references public.education_levels (id, school_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class child on child.oid = con.conrelid
    join pg_namespace child_ns on child_ns.oid = child.relnamespace
    where con.conname = 'student_discounts_approver_tenant_fkey'
      and child_ns.nspname = 'public'
      and child.relname = 'student_discounts'
  ) then
    alter table public.student_discounts
      add constraint student_discounts_approver_tenant_fkey
      foreign key (approved_by, school_id)
      references public.profiles (id, school_id);
  end if;
end;
$$;
