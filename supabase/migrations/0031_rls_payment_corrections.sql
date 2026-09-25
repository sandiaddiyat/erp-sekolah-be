-- =============================================================================
-- Koreksi lanjutan relasi tenant dan payment invoice setelah 0030
-- =============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bill_items_id_school_unique'
  ) then
    alter table public.bill_items
      add constraint bill_items_id_school_unique unique (id, school_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bills_student_tenant_fkey'
  ) then
    alter table public.bills
      add constraint bills_student_tenant_fkey
      foreign key (student_id, school_id)
      references public.students (id, school_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bills_item_tenant_fkey'
  ) then
    alter table public.bills
      add constraint bills_item_tenant_fkey
      foreign key (bill_item_id, school_id)
      references public.bill_items (id, school_id);
  end if;
end;
$$;

drop policy if exists payments_insert on public.payments;
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

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update to authenticated
  using (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and bill_id is not null
      and invoice_id is null
      and public.has_permission('finance.payment_verify')
    )
  )
  with check (
    public.is_super_admin() or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and bill_id is not null
      and invoice_id is null
      and public.has_permission('finance.payment_verify')
    )
  );
