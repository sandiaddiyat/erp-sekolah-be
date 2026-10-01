-- 0037: Drop redundant single-column tenant FKs

-- Setelah migrasi 0030/0031/0033 menambahkan composite tenant FKs
-- (col, school_id -> ref.id, ref.school_id), original single-column inline FKs
-- (mis. bills_student_id_fkey) masih ada dan menyebabkan PostgREST embedded-select
-- menjadi AMBIGUOUS ("relationship ... is ambiguous").

-- Solusi: DROP semua original single-column FKs yang redundant.
-- Composite *_tenant_fkey tetap ada dan menyediakan integritas tenant isolation.
-- Akademik pages sudah pakai constraint-name syntax; ini memastikan semua
-- query existing (termasuk service.ts) bebas ambiguity.

set local statement_timeout = '30s';

-- bills
alter table public.bills drop constraint if exists bills_student_id_fkey;
alter table public.bills drop constraint if exists bills_bill_item_id_fkey;

-- fee_structures
alter table public.fee_structures drop constraint if exists fee_structures_academic_year_id_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_education_level_id_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_grade_id_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_major_id_fkey;
alter table public.fee_structures drop constraint if exists fee_structures_fee_category_id_fkey;

-- invoices
alter table public.invoices drop constraint if exists invoices_student_id_fkey;
alter table public.invoices drop constraint if exists invoices_guardian_id_fkey;
alter table public.invoices drop constraint if exists invoices_academic_year_id_fkey;

-- invoice_details
alter table public.invoice_details drop constraint if exists invoice_details_invoice_id_fkey;
alter table public.invoice_details drop constraint if exists invoice_details_fee_structure_id_fkey;

-- student_discounts
alter table public.student_discounts drop constraint if exists student_discounts_student_id_fkey;
alter table public.student_discounts drop constraint if exists student_discounts_discount_type_id_fkey;

-- student_enrollments
alter table public.student_enrollments drop constraint if exists student_enrollments_student_id_fkey;
alter table public.student_enrollments drop constraint if exists student_enrollments_academic_year_id_fkey;
alter table public.student_enrollments drop constraint if exists student_enrollments_class_id_fkey;

-- classes
alter table public.classes drop constraint if exists classes_academic_year_id_fkey;
alter table public.classes drop constraint if exists classes_grade_id_fkey;
alter table public.classes drop constraint if exists classes_major_id_fkey;
alter table public.classes drop constraint if exists classes_room_id_fkey;
alter table public.classes drop constraint if exists classes_homeroom_teacher_id_fkey;

-- grades -> education_levels
alter table public.grades drop constraint if exists grades_education_level_id_fkey;

-- majors -> education_levels
alter table public.majors drop constraint if exists majors_education_level_id_fkey;

-- guardians -> families
alter table public.guardians drop constraint if exists guardians_family_id_fkey;

-- students -> families
alter table public.students drop constraint if exists students_family_id_fkey;

-- billing_run_logs -> academic_years
alter table public.billing_run_logs drop constraint if exists billing_run_logs_academic_year_id_fkey;

-- payments: hanya drop FK asli yang redundant dengan tenant FK
-- (tidak drop payments_bill_id_fkey karena bills masih dipakai oleh modul keuangan lama)
-- Biarkan payments_bill_id_fkey asli tetap — tidak conflict karena bills tidak di-embed
-- dari payments di query mana pun.
-- payments_invoice_id_fkey dan payments_payment_method_id_fkey juga tidak conflict
-- karena invoices/payment_methods tidak di-embed dari payments di query mana pun.
