-- =============================================================================
-- RLS hardening: enable RLS on remaining tables + composite tenant FKs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enable RLS on tables that are still missing it
-- -----------------------------------------------------------------------------

-- Academic tables (0018_akademik.sql)
alter table public.academic_years enable row level security;
alter table public.education_levels enable row level security;
alter table public.grades enable row level security;
alter table public.majors enable row level security;
alter table public.rooms enable row level security;
alter table public.classes enable row level security;
alter table public.student_enrollments enable row level security;

-- Family & guardians (0020_families.sql)
alter table public.families enable row level security;
alter table public.guardians enable row level security;

-- Fee structures (0019_fee_structures.sql)
alter table public.fee_categories enable row level security;
alter table public.fee_structures enable row level security;

-- Billing (0011_keuangan.sql)
alter table public.bill_items enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;

-- Discounts (0022_discounts.sql)
alter table public.discount_types enable row level security;
alter table public.student_discounts enable row level security;

-- -----------------------------------------------------------------------------
-- 2. Create tenant-aware policies for tables that are missing them
-- -----------------------------------------------------------------------------

-- Academic years
drop policy if exists academic_years_select on public.academic_years;
create policy academic_years_select on public.academic_years
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists academic_years_insert on public.academic_years;
create policy academic_years_insert on public.academic_years
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists academic_years_update on public.academic_years;
create policy academic_years_update on public.academic_years
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists academic_years_delete on public.academic_years;
create policy academic_years_delete on public.academic_years
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Education levels
drop policy if exists education_levels_select on public.education_levels;
create policy education_levels_select on public.education_levels
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists education_levels_insert on public.education_levels;
create policy education_levels_insert on public.education_levels
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists education_levels_update on public.education_levels;
create policy education_levels_update on public.education_levels
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists education_levels_delete on public.education_levels;
create policy education_levels_delete on public.education_levels
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Grades
drop policy if exists grades_select on public.grades;
create policy grades_select on public.grades
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists grades_insert on public.grades;
create policy grades_insert on public.grades
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists grades_update on public.grades;
create policy grades_update on public.grades
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists grades_delete on public.grades;
create policy grades_delete on public.grades
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Majors
drop policy if exists majors_select on public.majors;
create policy majors_select on public.majors
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists majors_insert on public.majors;
create policy majors_insert on public.majors
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists majors_update on public.majors;
create policy majors_update on public.majors
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists majors_delete on public.majors;
create policy majors_delete on public.majors
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Rooms
drop policy if exists rooms_select on public.rooms;
create policy rooms_select on public.rooms
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists rooms_insert on public.rooms;
create policy rooms_insert on public.rooms
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists rooms_delete on public.rooms;
create policy rooms_delete on public.rooms
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Classes
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Student enrollments
drop policy if exists student_enrollments_select on public.student_enrollments;
create policy student_enrollments_select on public.student_enrollments
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists student_enrollments_insert on public.student_enrollments;
create policy student_enrollments_insert on public.student_enrollments
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists student_enrollments_update on public.student_enrollments;
create policy student_enrollments_update on public.student_enrollments
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists student_enrollments_delete on public.student_enrollments;
create policy student_enrollments_delete on public.student_enrollments
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Families
drop policy if exists families_select on public.families;
create policy families_select on public.families
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists families_insert on public.families;
create policy families_insert on public.families
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists families_update on public.families;
create policy families_update on public.families
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists families_delete on public.families;
create policy families_delete on public.families
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Guardians
drop policy if exists guardians_select on public.guardians;
create policy guardians_select on public.guardians
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists guardians_insert on public.guardians;
create policy guardians_insert on public.guardians
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

drop policy if exists guardians_update on public.guardians;
create policy guardians_update on public.guardians
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists guardians_delete on public.guardians;
create policy guardians_delete on public.guardians
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('academics.manage')));

-- Fee categories
drop policy if exists fee_categories_select on public.fee_categories;
create policy fee_categories_select on public.fee_categories
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists fee_categories_insert on public.fee_categories;
create policy fee_categories_insert on public.fee_categories
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));

drop policy if exists fee_categories_update on public.fee_categories;
create policy fee_categories_update on public.fee_categories
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('fee_structure.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists fee_categories_delete on public.fee_categories;
create policy fee_categories_delete on public.fee_categories
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));

-- Fee structures
drop policy if exists fee_structures_select on public.fee_structures;
create policy fee_structures_select on public.fee_structures
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists fee_structures_insert on public.fee_structures;
create policy fee_structures_insert on public.fee_structures
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));

drop policy if exists fee_structures_update on public.fee_structures;
create policy fee_structures_update on public.fee_structures
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('fee_structure.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists fee_structures_delete on public.fee_structures;
create policy fee_structures_delete on public.fee_structures
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('fee_structure.manage')));

-- Bill items
drop policy if exists bill_items_select on public.bill_items;
create policy bill_items_select on public.bill_items
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bill_items_insert on public.bill_items;
create policy bill_items_insert on public.bill_items
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('billing.manage')));

drop policy if exists bill_items_update on public.bill_items;
create policy bill_items_update on public.bill_items
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('billing.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bill_items_delete on public.bill_items;
create policy bill_items_delete on public.bill_items
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('billing.manage')));

-- Bills
drop policy if exists bills_select on public.bills;
create policy bills_select on public.bills
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bills_insert on public.bills;
create policy bills_insert on public.bills
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('billing.manage')));

drop policy if exists bills_update on public.bills;
create policy bills_update on public.bills
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('billing.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bills_delete on public.bills;
create policy bills_delete on public.bills
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('billing.manage')));

-- Discount types
drop policy if exists discount_types_select on public.discount_types;
create policy discount_types_select on public.discount_types
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists discount_types_insert on public.discount_types;
create policy discount_types_insert on public.discount_types
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('discount.manage')));

drop policy if exists discount_types_update on public.discount_types;
create policy discount_types_update on public.discount_types
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('discount.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists discount_types_delete on public.discount_types;
create policy discount_types_delete on public.discount_types
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('discount.manage')));

-- Student discounts
drop policy if exists student_discounts_select on public.student_discounts;
create policy student_discounts_select on public.student_discounts
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists student_discounts_insert on public.student_discounts;
create policy student_discounts_insert on public.student_discounts
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('discount.manage')));

drop policy if exists student_discounts_update on public.student_discounts;
create policy student_discounts_update on public.student_discounts
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('discount.manage')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists student_discounts_delete on public.student_discounts;
create policy student_discounts_delete on public.student_discounts
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('discount.manage')));

-- -----------------------------------------------------------------------------
-- 3. Composite tenant foreign keys for tenant integrity
-- -----------------------------------------------------------------------------

-- Payments must reference invoices with (school_id, invoice_id)
alter table public.payments
  drop constraint if exists payments_invoice_id_fkey,
  add constraint payments_invoice_tenant_fk
    foreign key (school_id, invoice_id)
    references public.invoices(school_id, id)
    on delete set null;

-- Payments must reference bills with (school_id, bill_id)
alter table public.payments
  drop constraint if exists payments_bill_id_fkey,
  add constraint payments_bill_tenant_fk
    foreign key (school_id, bill_id)
    references public.bills(school_id, id)
    on delete cascade;

-- Invoice details must reference invoices with (school_id, id)
alter table public.invoice_details
  drop constraint if exists invoice_details_invoice_id_fkey,
  add constraint invoice_details_invoice_tenant_fk
    foreign key (school_id, invoice_id)
    references public.invoices(school_id, id)
    on delete cascade;
