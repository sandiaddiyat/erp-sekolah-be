-- =============================================================================
-- Hardening relasi tenant dan pembayaran invoice (koreksi setelah 0029)
-- =============================================================================

alter table public.invoice_details drop constraint if exists invoice_details_invoice_tenant_fkey;
alter table public.invoice_details drop constraint if exists invoice_details_fee_structure_tenant_fkey;
alter table public.payments drop constraint if exists payments_bill_tenant_fkey;
alter table public.payments drop constraint if exists payments_invoice_tenant_fkey;
alter table public.payments drop constraint if exists payments_method_tenant_fkey;
alter table public.payments drop constraint if exists payments_recorder_tenant_fkey;
alter table public.payments drop constraint if exists payments_verifier_tenant_fkey;
alter table public.payments drop constraint if exists payments_reference_check;
alter table public.student_discounts drop constraint if exists student_discounts_approver_tenant_fkey;
alter table public.student_discounts drop constraint if exists student_discounts_student_tenant_fkey;
alter table public.student_discounts drop constraint if exists student_discounts_type_tenant_fkey;
alter table public.student_enrollments drop constraint if exists student_enrollments_student_tenant_fkey;
alter table public.student_enrollments drop constraint if exists student_enrollments_year_tenant_fkey;
alter table public.student_enrollments drop constraint if exists student_enrollments_class_tenant_fkey;
alter table public.classes drop constraint if exists classes_academic_year_tenant_fkey;
alter table public.classes drop constraint if exists classes_grade_tenant_fkey;
alter table public.classes drop constraint if exists classes_major_tenant_fkey;
alter table public.classes drop constraint if exists classes_room_tenant_fkey;
alter table public.classes drop constraint if exists classes_teacher_tenant_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_year_tenant_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_level_tenant_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_grade_tenant_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_major_tenant_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_category_tenant_fkey;
alter table public.invoices drop constraint if exists invoices_student_tenant_fkey;
alter table public.invoices drop constraint if exists invoices_guardian_tenant_fkey;
alter table public.invoices drop constraint if exists invoices_year_tenant_fkey;
alter table public.guardians drop constraint if exists guardians_family_tenant_fkey;
alter table public.billing_run_logs drop constraint if exists billing_run_logs_year_tenant_fkey;
alter table public.bills drop constraint if exists bills_student_tenant_fkey;
alter table public.bills drop constraint if exists bills_item_tenant_fkey;
alter table public.grades drop constraint if exists grades_education_level_tenant_fkey;
alter table public.majors drop constraint if exists majors_education_level_tenant_fkey;

alter table public.students drop constraint if exists students_id_school_unique;
alter table public.academic_years drop constraint if exists academic_years_id_school_unique;
alter table public.education_levels drop constraint if exists education_levels_id_school_unique;
alter table public.grades drop constraint if exists grades_id_school_unique;
alter table public.majors drop constraint if exists majors_id_school_unique;
alter table public.rooms drop constraint if exists rooms_id_school_unique;
alter table public.pegawai drop constraint if exists pegawai_id_school_unique;
alter table public.classes drop constraint if exists classes_id_school_unique;
alter table public.families drop constraint if exists families_id_school_unique;
alter table public.guardians drop constraint if exists guardians_id_school_unique;
alter table public.bill_items drop constraint if exists bill_items_id_school_unique;
alter table public.fee_categories drop constraint if exists fee_categories_id_school_unique;
alter table public.fee_structures drop constraint if exists fee_structures_id_school_unique;
alter table public.invoices drop constraint if exists invoices_id_school_unique;
alter table public.bills drop constraint if exists bills_id_school_unique;
alter table public.discount_types drop constraint if exists discount_types_id_school_unique;
alter table public.payment_methods drop constraint if exists payment_methods_id_school_unique;
alter table public.profiles drop constraint if exists profiles_id_school_unique;

alter table public.invoice_details add column if not exists school_id uuid;

update public.invoice_details d
   set school_id = i.school_id
  from public.invoices i
 where d.invoice_id = i.id
   and d.school_id is distinct from i.school_id;

alter table public.invoice_details
  alter column school_id set not null;

alter table public.students
  add constraint students_id_school_unique unique (id, school_id);
alter table public.academic_years
  add constraint academic_years_id_school_unique unique (id, school_id);
alter table public.education_levels
  add constraint education_levels_id_school_unique unique (id, school_id);
alter table public.grades
  add constraint grades_id_school_unique unique (id, school_id);
alter table public.majors
  add constraint majors_id_school_unique unique (id, school_id);
alter table public.rooms
  add constraint rooms_id_school_unique unique (id, school_id);
alter table public.pegawai
  add constraint pegawai_id_school_unique unique (id, school_id);
alter table public.classes
  add constraint classes_id_school_unique unique (id, school_id);
alter table public.families
  add constraint families_id_school_unique unique (id, school_id);
alter table public.guardians
  add constraint guardians_id_school_unique unique (id, school_id);
alter table public.fee_categories
  add constraint fee_categories_id_school_unique unique (id, school_id);
alter table public.fee_structures
  add constraint fee_structures_id_school_unique unique (id, school_id);
alter table public.invoices
  add constraint invoices_id_school_unique unique (id, school_id);
alter table public.bills
  add constraint bills_id_school_unique unique (id, school_id);
alter table public.discount_types
  add constraint discount_types_id_school_unique unique (id, school_id);
alter table public.payment_methods
  add constraint payment_methods_id_school_unique unique (id, school_id);
alter table public.profiles
  add constraint profiles_id_school_unique unique (id, school_id);

alter table public.classes
  add constraint classes_academic_year_tenant_fkey
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id);
alter table public.classes
  add constraint classes_grade_tenant_fkey
  foreign key (grade_id, school_id) references public.grades (id, school_id);
alter table public.classes
  add constraint classes_major_tenant_fkey
  foreign key (major_id, school_id) references public.majors (id, school_id);
alter table public.classes
  add constraint classes_room_tenant_fkey
  foreign key (room_id, school_id) references public.rooms (id, school_id);
alter table public.classes
  add constraint classes_teacher_tenant_fkey
  foreign key (homeroom_teacher_id, school_id) references public.pegawai (id, school_id);

alter table public.student_enrollments
  add constraint student_enrollments_student_tenant_fkey
  foreign key (student_id, school_id) references public.students (id, school_id);
alter table public.student_enrollments
  add constraint student_enrollments_year_tenant_fkey
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id);
alter table public.student_enrollments
  add constraint student_enrollments_class_tenant_fkey
  foreign key (class_id, school_id) references public.classes (id, school_id);

alter table public.guardians
  add constraint guardians_family_tenant_fkey
  foreign key (family_id, school_id) references public.families (id, school_id);

alter table public.fee_structures
  add constraint fee_structures_year_tenant_fkey
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id);
alter table public.fee_structures
  add constraint fee_structures_level_tenant_fkey
  foreign key (education_level_id, school_id) references public.education_levels (id, school_id);
alter table public.fee_structures
  add constraint fee_structures_grade_tenant_fkey
  foreign key (grade_id, school_id) references public.grades (id, school_id);
alter table public.fee_structures
  add constraint fee_structures_major_tenant_fkey
  foreign key (major_id, school_id) references public.majors (id, school_id);
alter table public.fee_structures
  add constraint fee_structures_category_tenant_fkey
  foreign key (fee_category_id, school_id) references public.fee_categories (id, school_id);

alter table public.invoices
  add constraint invoices_student_tenant_fkey
  foreign key (student_id, school_id) references public.students (id, school_id);
alter table public.invoices
  add constraint invoices_guardian_tenant_fkey
  foreign key (guardian_id, school_id) references public.guardians (id, school_id);
alter table public.invoices
  add constraint invoices_year_tenant_fkey
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id);

alter table public.invoice_details
  add constraint invoice_details_invoice_tenant_fkey
  foreign key (invoice_id, school_id) references public.invoices (id, school_id);
alter table public.invoice_details
  add constraint invoice_details_fee_structure_tenant_fkey
  foreign key (fee_structure_id, school_id) references public.fee_structures (id, school_id);

alter table public.billing_run_logs
  add constraint billing_run_logs_year_tenant_fkey
  foreign key (academic_year_id, school_id) references public.academic_years (id, school_id);

alter table public.student_discounts
  add constraint student_discounts_student_tenant_fkey
  foreign key (student_id, school_id) references public.students (id, school_id);
alter table public.student_discounts
  add constraint student_discounts_type_tenant_fkey
  foreign key (discount_type_id, school_id) references public.discount_types (id, school_id);

alter table public.payments
  add column if not exists payment_method_id uuid;
alter table public.payments
  alter column bill_id drop not null;
alter table public.payments
  alter column metode drop not null;
alter table public.payments
  add constraint payments_reference_check check (
    (bill_id is not null and invoice_id is null and payment_method_id is null)
    or
    (bill_id is null and invoice_id is not null and payment_method_id is not null)
  );
alter table public.payments
  add constraint payments_bill_tenant_fkey
  foreign key (bill_id, school_id) references public.bills (id, school_id);
alter table public.payments
  add constraint payments_invoice_tenant_fkey
  foreign key (invoice_id, school_id) references public.invoices (id, school_id);
alter table public.payments
  add constraint payments_method_tenant_fkey
  foreign key (payment_method_id, school_id) references public.payment_methods (id, school_id);
alter table public.payments
  add constraint payments_recorder_tenant_fkey
  foreign key (dicatat_oleh, school_id) references public.profiles (id, school_id);
alter table public.payments
  add constraint payments_verifier_tenant_fkey
  foreign key (diverifikasi_oleh, school_id) references public.profiles (id, school_id);
alter table public.bill_items
  add constraint bill_items_id_school_unique unique (id, school_id);
alter table public.bills
  add constraint bills_student_tenant_fkey
  foreign key (student_id, school_id) references public.students (id, school_id);
alter table public.bills
  add constraint bills_item_tenant_fkey
  foreign key (bill_item_id, school_id) references public.bill_items (id, school_id);
alter table public.grades
  add constraint grades_education_level_tenant_fkey
  foreign key (education_level_id, school_id) references public.education_levels (id, school_id);
alter table public.majors
  add constraint majors_education_level_tenant_fkey
  foreign key (education_level_id, school_id) references public.education_levels (id, school_id);
alter table public.student_discounts
  add constraint student_discounts_approver_tenant_fkey
  foreign key (approved_by, school_id) references public.profiles (id, school_id);

create index if not exists payments_payment_method_idx
  on public.payments (payment_method_id);
create index if not exists invoice_details_school_idx
  on public.invoice_details (school_id);

drop policy if exists invoice_details_select on public.invoice_details;
drop policy if exists invoice_details_insert on public.invoice_details;
drop policy if exists invoice_details_update on public.invoice_details;
drop policy if exists invoice_details_delete on public.invoice_details;
create policy invoice_details_select on public.invoice_details
  for select to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (public.has_permission('billing.view') or public.has_permission('billing.manage'))
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id and fs.school_id = public.current_school_id()
      )
    )
  );
create policy invoice_details_insert on public.invoice_details
  for insert to authenticated
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id and fs.school_id = public.current_school_id()
      )
    )
  );
create policy invoice_details_update on public.invoice_details
  for update to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id and fs.school_id = public.current_school_id()
      )
    )
  )
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and exists (
        select 1 from public.fee_structures fs
        where fs.id = fee_structure_id and fs.school_id = public.current_school_id()
      )
    )
  );
create policy invoice_details_delete on public.invoice_details
  for delete to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('billing.manage')
      and exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
    )
  );

drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        public.has_permission('finance.view')
        or public.has_permission('billing.view')
        or public.has_permission('billing.manage')
      )
    )
  );
create policy payments_insert on public.payments
  for insert to authenticated
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        (
          bill_id is not null
          and invoice_id is null
          and payment_method_id is null
          and public.has_permission('finance.payment_create')
        )
        or
        (
          bill_id is null
          and invoice_id is not null
          and payment_method_id is not null
          and dicatat_oleh = auth.uid()
          and diverifikasi_oleh = auth.uid()
          and status = 'terverifikasi'
          and public.has_permission('billing.manage')
        )
      )
    )
  );
create policy payments_update on public.payments
  for update to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        (bill_id is not null and invoice_id is null and public.has_permission('finance.payment_verify'))
        or
        (
          bill_id is null
          and invoice_id is not null
          and dicatat_oleh = auth.uid()
          and diverifikasi_oleh = auth.uid()
          and status = 'terverifikasi'
          and public.has_permission('billing.manage')
        )
      )
    )
  )
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        (bill_id is not null and invoice_id is null and public.has_permission('finance.payment_verify'))
        or
        (
          bill_id is null
          and invoice_id is not null
          and dicatat_oleh = auth.uid()
          and diverifikasi_oleh = auth.uid()
          and status = 'terverifikasi'
          and public.has_permission('billing.manage')
        )
      )
    )
  );
create policy payments_delete on public.payments
  for delete to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and bill_id is not null
      and public.has_permission('finance.payment_verify')
    )
  );

drop policy if exists fee_structures_select on public.fee_structures;
create policy fee_structures_select on public.fee_structures
  for select to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        public.has_permission('fee_structure.view')
        or public.has_permission('fee_structure.manage')
        or public.has_permission('billing.view')
        or public.has_permission('billing.manage')
      )
    )
  );
