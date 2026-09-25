-- =============================================================================
-- Integritas referensi payments setelah mode invoice ditambahkan
-- =============================================================================

do $$
begin
  if exists (
    select 1
    from public.payments
    where not (
      (bill_id is not null and invoice_id is null and payment_method_id is null and metode is not null)
      or
      (bill_id is null and invoice_id is not null and payment_method_id is not null and metode is null)
    )
  ) then
    raise exception 'Data payments lama tidak konsisten dengan mode bill/invoice.';
  end if;
end;
$$;

alter table public.payments
  drop constraint if exists payments_reference_check;

alter table public.payments
  add constraint payments_reference_check check (
    (bill_id is not null and invoice_id is null and payment_method_id is null and metode is not null)
    or
    (bill_id is null and invoice_id is not null and payment_method_id is not null and metode is null)
  );
