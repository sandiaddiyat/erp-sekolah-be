-- =============================================================================
-- RLS policies untuk tabel Modul Otomasi Tagihan (0018–0023)
-- Tabel-tabel ini ter-enable RLS tanpa policy sehingga semua akses diblokir.
-- Pola mengikuti 0010/0011: is_super_admin() or school_id = current_school_id()
-- + has_permission untuk tulis.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: policy standar per tabel (select / insert / update / delete)
-- -----------------------------------------------------------------------------
create or replace function public.grant_tenant_policies(
  p_table text,
  p_view_perm text,
  p_manage_perm text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('drop policy if exists %I on public.%I', p_table || '_select', p_table);
  execute format(
    'create policy %I on public.%I for select to authenticated
     using (public.is_super_admin() or school_id = public.current_school_id())',
    p_table || '_select', p_table
  );

  execute format('drop policy if exists %I on public.%I', p_table || '_insert', p_table);
  execute format(
    'create policy %I on public.%I for insert to authenticated
     with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission(%L)))',
    p_table || '_insert', p_table, p_manage_perm
  );

  execute format('drop policy if exists %I on public.%I', p_table || '_update', p_table);
  execute format(
    'create policy %I on public.%I for update to authenticated
     using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission(%L)))
     with check (public.is_super_admin() or school_id = public.current_school_id())',
    p_table || '_update', p_table, p_manage_perm
  );

  execute format('drop policy if exists %I on public.%I', p_table || '_delete', p_table);
  execute format(
    'create policy %I on public.%I for delete to authenticated
     using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission(%L)))',
    p_table || '_delete', p_table, p_manage_perm
  );
end;
$$;

revoke execute on function public.grant_tenant_policies(text, text, text) from public, anon;
grant execute on function public.grant_tenant_policies(text, text, text) to authenticated;

-- Akademik: tahun ajaran, jenjang, tingkat, jurusan, ruangan, kelas, pendaftaran
select public.grant_tenant_policies('academic_years',       'academics.view', 'academics.manage');
select public.grant_tenant_policies('education_levels',     'academics.view', 'academics.manage');
select public.grant_tenant_policies('grades',               'academics.view', 'academics.manage');
select public.grant_tenant_policies('majors',               'academics.view', 'academics.manage');
select public.grant_tenant_policies('rooms',                'academics.view', 'academics.manage');
select public.grant_tenant_policies('classes',              'academics.view', 'academics.manage');
select public.grant_tenant_policies('student_enrollments',  'academics.view', 'academics.manage');

-- Keluarga & wali murid: data master pendukung pendaftaran
select public.grant_tenant_policies('families', 'academics.view', 'academics.manage');
select public.grant_tenant_policies('guardians', 'academics.view', 'academics.manage');

-- Skema biaya
select public.grant_tenant_policies('fee_categories', 'fee_structure.view', 'fee_structure.manage');
select public.grant_tenant_policies('fee_structures', 'fee_structure.view', 'fee_structure.manage');

-- Tagihan otomatis: invoices, log job
select public.grant_tenant_policies('invoices',         'billing.view', 'billing.manage');
select public.grant_tenant_policies('billing_run_logs', 'billing.view', 'billing.manage');

-- invoice_details: tanpa school_id — akses lewat invoice induknya
drop policy if exists invoice_details_select on public.invoice_details;
create policy invoice_details_select on public.invoice_details
  for select to authenticated
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.school_id = public.current_school_id()
    )
  );

drop policy if exists invoice_details_insert on public.invoice_details;
create policy invoice_details_insert on public.invoice_details
  for insert to authenticated
  with check (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and public.has_permission('billing.manage')
    )
  );

drop policy if exists invoice_details_update on public.invoice_details;
create policy invoice_details_update on public.invoice_details
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and public.has_permission('billing.manage')
    )
  );

drop policy if exists invoice_details_delete on public.invoice_details;
create policy invoice_details_delete on public.invoice_details
  for delete to authenticated
  using (
    public.is_super_admin()
    or (
      exists (
        select 1 from public.invoices i
        where i.id = invoice_id and i.school_id = public.current_school_id()
      )
      and public.has_permission('billing.manage')
    )
  );

-- Metode pembayaran & rekening (dipakai halaman tagihan otomatis)
select public.grant_tenant_policies('payment_methods', 'billing.view', 'billing.manage');
select public.grant_tenant_policies('bank_accounts',   'billing.view', 'billing.manage');

-- Diskon & beasiswa
select public.grant_tenant_policies('discount_types',    'discount.view', 'discount.manage');
select public.grant_tenant_policies('student_discounts', 'discount.view', 'discount.manage');
