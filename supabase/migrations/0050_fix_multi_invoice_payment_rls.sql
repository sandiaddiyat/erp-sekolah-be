-- =============================================================================
-- Migrasi 0050: Izinkan header payment untuk payment_invoices
-- =============================================================================
-- Gejala: pembayaran gabungan dari rekonsiliasi gagal dengan error RLS pada
-- tabel payments.
--
-- Penyebab: service multi-invoice menyimpan header payments tanpa invoice_id;
-- rincian invoice disimpan di payment_invoices. Policy lama masih mewajibkan
-- invoice_id tidak null untuk mode billing.manage.
--
-- Migration ini hanya memperbaiki policy INSERT. Tidak menghapus data payment
-- lama dan tidak mengubah constraint payments_reference_check yang sudah
-- mendukung bill legacy atau header multi-invoice.
-- =============================================================================

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
          and invoice_id is null
          and payment_method_id is not null
          and dicatat_oleh = auth.uid()
          and diverifikasi_oleh = auth.uid()
          and status = 'terverifikasi'
          and public.has_permission('billing.manage')
        )
      )
    )
  );
