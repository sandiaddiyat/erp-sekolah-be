-- =============================================================================
-- Issue #97: perbaiki grant permission role sistem per-sekolah
--
-- Migration 0017 memakai roles.school_id IS NULL, sedangkan create_default_roles
-- selalu membuat role dengan school_id terisi. Migration ini hanya menambah grant
-- yang hilang, tidak menghapus permission manual dan aman dijalankan berulang.
-- =============================================================================

-- Bendahara: akses operasional keuangan.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug = 'bendahara'
  and p.slug = any (array[
    'dashboard.view',
    'students.view',
    'finance.view',
    'finance.bill_create',
    'finance.payment_create',
    'finance.payment_verify',
    'finance.report_view',
    'finance.bill_item_view',
    'finance.bill_item_manage',
    'fee_structure.view',
    'fee_structure.manage',
    'billing.view',
    'billing.manage',
    'discount.view',
    'discount.manage',
    'finance.invoice.view',
    'finance.invoice.manage',
    'reports.view'
  ]::text[])
on conflict (role_id, permission_id) do nothing;
-- Kepala Sekolah: akses baca keuangan dan laporan.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug = 'kepala_sekolah'
  and p.slug = any (array[
    'dashboard.view',
    'students.view',
    'finance.view',
    'finance.report_view',
    'finance.bill_item_view',
    'academics.view',
    'fee_structure.view',
    'billing.view',
    'discount.view',
    'finance.invoice.view',
    'reports.view',
    'settings.view'
  ]::text[])
on conflict (role_id, permission_id) do nothing;

-- Admin Sekolah: lengkapi permission baru untuk role yang dibuat sebelum
-- migration permission terbaru. Existing custom grants tetap dipertahankan.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug = 'admin_sekolah'
on conflict (role_id, permission_id) do nothing;
