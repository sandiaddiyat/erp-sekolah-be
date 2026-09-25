do $$
begin
  if to_regprocedure('public.grant_tenant_policies(text,text,text)') is not null then
    execute 'revoke all on function public.grant_tenant_policies(text, text, text) from public, anon, authenticated';
  end if;
end;
$$;

drop function if exists public.grant_tenant_policies(text, text, text);

alter table public.academic_years enable row level security;
alter table public.education_levels enable row level security;
alter table public.grades enable row level security;
alter table public.majors enable row level security;
alter table public.rooms enable row level security;
alter table public.classes enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.fee_categories enable row level security;
alter table public.fee_structures enable row level security;
alter table public.families enable row level security;
alter table public.guardians enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_details enable row level security;
alter table public.billing_run_logs enable row level security;
alter table public.discount_types enable row level security;
alter table public.student_discounts enable row level security;
alter table public.payment_methods enable row level security;
alter table public.bank_accounts enable row level security;

drop policy if exists academic_years_select on public.academic_years;
drop policy if exists academic_years_insert on public.academic_years;
drop policy if exists academic_years_update on public.academic_years;
drop policy if exists academic_years_delete on public.academic_years;
create policy academic_years_select on public.academic_years
  for select to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        public.has_permission('academics.view') or public.has_permission('academics.manage')
        or public.has_permission('fee_structure.view') or public.has_permission('fee_structure.manage')
        or public.has_permission('billing.view') or public.has_permission('billing.manage')
      )
    )
  );
create policy academic_years_insert on public.academic_years
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy academic_years_update on public.academic_years
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy academic_years_delete on public.academic_years
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists education_levels_select on public.education_levels;
drop policy if exists education_levels_insert on public.education_levels;
drop policy if exists education_levels_update on public.education_levels;
drop policy if exists education_levels_delete on public.education_levels;
create policy education_levels_select on public.education_levels
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('fee_structure.view') or public.has_permission('fee_structure.manage'))));
create policy education_levels_insert on public.education_levels
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy education_levels_update on public.education_levels
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy education_levels_delete on public.education_levels
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists grades_select on public.grades;
drop policy if exists grades_insert on public.grades;
drop policy if exists grades_update on public.grades;
drop policy if exists grades_delete on public.grades;
create policy grades_select on public.grades
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('fee_structure.view') or public.has_permission('fee_structure.manage'))));
create policy grades_insert on public.grades
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy grades_update on public.grades
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy grades_delete on public.grades
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists majors_select on public.majors;
drop policy if exists majors_insert on public.majors;
drop policy if exists majors_update on public.majors;
drop policy if exists majors_delete on public.majors;
create policy majors_select on public.majors
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('fee_structure.view') or public.has_permission('fee_structure.manage'))));
create policy majors_insert on public.majors
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy majors_update on public.majors
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy majors_delete on public.majors
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists rooms_select on public.rooms;
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists rooms_delete on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage'))));
create policy rooms_insert on public.rooms
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy rooms_update on public.rooms
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy rooms_delete on public.rooms
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists classes_select on public.classes;
drop policy if exists classes_insert on public.classes;
drop policy if exists classes_update on public.classes;
drop policy if exists classes_delete on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('billing.manage'))));
create policy classes_insert on public.classes
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy classes_update on public.classes
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy classes_delete on public.classes
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists student_enrollments_select on public.student_enrollments;
drop policy if exists student_enrollments_insert on public.student_enrollments;
drop policy if exists student_enrollments_update on public.student_enrollments;
drop policy if exists student_enrollments_delete on public.student_enrollments;
create policy student_enrollments_select on public.student_enrollments
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('billing.manage'))));
create policy student_enrollments_insert on public.student_enrollments
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy student_enrollments_update on public.student_enrollments
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy student_enrollments_delete on public.student_enrollments
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists fee_categories_select on public.fee_categories;
drop policy if exists fee_categories_insert on public.fee_categories;
drop policy if exists fee_categories_update on public.fee_categories;
drop policy if exists fee_categories_delete on public.fee_categories;
create policy fee_categories_select on public.fee_categories
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('fee_structure.view') or public.has_permission('fee_structure.manage') or public.has_permission('discount.view') or public.has_permission('discount.manage') or public.has_permission('billing.manage'))));
create policy fee_categories_insert on public.fee_categories
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));
create policy fee_categories_update on public.fee_categories
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));
create policy fee_categories_delete on public.fee_categories
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));

drop policy if exists fee_structures_select on public.fee_structures;
drop policy if exists fee_structures_insert on public.fee_structures;
drop policy if exists fee_structures_update on public.fee_structures;
drop policy if exists fee_structures_delete on public.fee_structures;
create policy fee_structures_select on public.fee_structures
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('fee_structure.view') or public.has_permission('fee_structure.manage') or public.has_permission('billing.manage'))));
create policy fee_structures_insert on public.fee_structures
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));
create policy fee_structures_update on public.fee_structures
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));
create policy fee_structures_delete on public.fee_structures
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));

drop policy if exists families_select on public.families;
drop policy if exists families_insert on public.families;
drop policy if exists families_update on public.families;
drop policy if exists families_delete on public.families;
create policy families_select on public.families
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('billing.manage'))));
create policy families_insert on public.families
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy families_update on public.families
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy families_delete on public.families
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists guardians_select on public.guardians;
drop policy if exists guardians_insert on public.guardians;
drop policy if exists guardians_update on public.guardians;
drop policy if exists guardians_delete on public.guardians;
create policy guardians_select on public.guardians
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('academics.view') or public.has_permission('academics.manage') or public.has_permission('billing.manage'))));
create policy guardians_insert on public.guardians
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy guardians_update on public.guardians
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));
create policy guardians_delete on public.guardians
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists invoices_select on public.invoices;
drop policy if exists invoices_insert on public.invoices;
drop policy if exists invoices_update on public.invoices;
drop policy if exists invoices_delete on public.invoices;
create policy invoices_select on public.invoices
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('billing.view') or public.has_permission('billing.manage'))));
create policy invoices_insert on public.invoices
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy invoices_update on public.invoices
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy invoices_delete on public.invoices
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));

drop policy if exists invoice_details_select on public.invoice_details;
drop policy if exists invoice_details_insert on public.invoice_details;
drop policy if exists invoice_details_update on public.invoice_details;
drop policy if exists invoice_details_delete on public.invoice_details;
create policy invoice_details_select on public.invoice_details
  for select to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and (public.has_permission('billing.view') or public.has_permission('billing.manage'))
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id
          and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id
          and fs.school_id = public.current_school_id()
      )
    )
  );
create policy invoice_details_insert on public.invoice_details
  for insert to authenticated
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id
          and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id
          and fs.school_id = public.current_school_id()
      )
    )
  );
create policy invoice_details_update on public.invoice_details
  for update to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id
          and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id
          and fs.school_id = public.current_school_id()
      )
    )
  )
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id
          and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id
          and fs.school_id = public.current_school_id()
      )
    )
  );
create policy invoice_details_delete on public.invoice_details
  for delete to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id
          and i.school_id = public.current_school_id()
      )
    )
  );

drop policy if exists billing_run_logs_select on public.billing_run_logs;
drop policy if exists billing_run_logs_insert on public.billing_run_logs;
drop policy if exists billing_run_logs_update on public.billing_run_logs;
drop policy if exists billing_run_logs_delete on public.billing_run_logs;
create policy billing_run_logs_select on public.billing_run_logs
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('billing.view') or public.has_permission('billing.manage'))));
create policy billing_run_logs_insert on public.billing_run_logs
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy billing_run_logs_update on public.billing_run_logs
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy billing_run_logs_delete on public.billing_run_logs
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));

drop policy if exists discount_types_select on public.discount_types;
drop policy if exists discount_types_insert on public.discount_types;
drop policy if exists discount_types_update on public.discount_types;
drop policy if exists discount_types_delete on public.discount_types;
create policy discount_types_select on public.discount_types
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('discount.view') or public.has_permission('discount.manage') or public.has_permission('billing.manage'))));
create policy discount_types_insert on public.discount_types
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')));
create policy discount_types_update on public.discount_types
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')));
create policy discount_types_delete on public.discount_types
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')));

drop policy if exists student_discounts_select on public.student_discounts;
drop policy if exists student_discounts_insert on public.student_discounts;
drop policy if exists student_discounts_update on public.student_discounts;
drop policy if exists student_discounts_delete on public.student_discounts;
create policy student_discounts_select on public.student_discounts
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('discount.view') or public.has_permission('discount.manage') or public.has_permission('billing.manage'))));
create policy student_discounts_insert on public.student_discounts
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')));
create policy student_discounts_update on public.student_discounts
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')));
create policy student_discounts_delete on public.student_discounts
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('discount.manage')));

drop policy if exists payment_methods_select on public.payment_methods;
drop policy if exists payment_methods_insert on public.payment_methods;
drop policy if exists payment_methods_update on public.payment_methods;
drop policy if exists payment_methods_delete on public.payment_methods;
create policy payment_methods_select on public.payment_methods
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('billing.view') or public.has_permission('billing.manage'))));
create policy payment_methods_insert on public.payment_methods
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy payment_methods_update on public.payment_methods
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy payment_methods_delete on public.payment_methods
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));

drop policy if exists bank_accounts_select on public.bank_accounts;
drop policy if exists bank_accounts_insert on public.bank_accounts;
drop policy if exists bank_accounts_update on public.bank_accounts;
drop policy if exists bank_accounts_delete on public.bank_accounts;
create policy bank_accounts_select on public.bank_accounts
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('billing.view') or public.has_permission('billing.manage'))));
create policy bank_accounts_insert on public.bank_accounts
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy bank_accounts_update on public.bank_accounts
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));
create policy bank_accounts_delete on public.bank_accounts
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('billing.manage')));

drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('finance.view') or public.has_permission('billing.view') or public.has_permission('billing.manage'))));
create policy payments_insert on public.payments
  for insert to authenticated
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('finance.payment_create') or public.has_permission('billing.manage'))));
create policy payments_update on public.payments
  for update to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('finance.payment_verify') or public.has_permission('billing.manage'))))
  with check (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and (public.has_permission('finance.payment_verify') or public.has_permission('billing.manage'))));
create policy payments_delete on public.payments
  for delete to authenticated
  using (public.is_super_admin() or (public.current_access_ok() and school_id = public.current_school_id() and public.has_permission('finance.payment_verify')));
