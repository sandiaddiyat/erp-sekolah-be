-- =============================================================================
-- RLS policy untuk tabel invoices (Issue #95)
-- invoices sudah di-enable RLS dan memiliki grant_tenant_policies via 0024.
-- Tambahkan policy select untuk invoices_read.
-- =============================================================================

drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());
