-- =============================================================================
-- Issue #121: template kuitansi dinamis per sekolah.
-- Menambah katalog permission, tabel tenant-isolated, serta template default.
-- Tidak mengubah migration lama dan tidak membuat nomor kuitansi persisten.
-- Alternatif manual: jalankan isi migration ini dalam satu transaksi di Supabase.
-- =============================================================================

insert into public.permissions (module, action, slug, name, description)
values
  ('finance', 'receipt_template_view', 'finance.receipt_template.view', 'Lihat Template Kuitansi', 'Melihat dan memakai template kuitansi'),
  ('finance', 'receipt_template_manage', 'finance.receipt_template.manage', 'Kelola Template Kuitansi', 'Membuat, mengubah, dan menghapus template kuitansi')
on conflict (slug) do nothing;

create table if not exists public.receipt_templates (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name varchar(120) not null,
  content_html text not null,
  content_css text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipt_templates_school_name_unique unique (school_id, name)
);

create index if not exists receipt_templates_school_id_idx
  on public.receipt_templates (school_id);

create unique index if not exists receipt_templates_one_default_per_school_idx
  on public.receipt_templates (school_id)
  where is_default = true;

drop trigger if exists set_receipt_templates_updated_at on public.receipt_templates;
create trigger set_receipt_templates_updated_at
  before update on public.receipt_templates
  for each row execute function public.set_updated_at();

alter table public.receipt_templates enable row level security;

drop policy if exists receipt_templates_select on public.receipt_templates;
create policy receipt_templates_select on public.receipt_templates
  for select using (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and (
        public.has_permission('finance.view')
        or public.has_permission('finance.receipt_template.view')
        or public.has_permission('finance.receipt_template.manage')
      )
    )
  );

drop policy if exists receipt_templates_insert on public.receipt_templates;
create policy receipt_templates_insert on public.receipt_templates
  for insert with check (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('finance.receipt_template.manage')
    )
  );

drop policy if exists receipt_templates_update on public.receipt_templates;
create policy receipt_templates_update on public.receipt_templates
  for update using (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('finance.receipt_template.manage')
    )
  ) with check (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('finance.receipt_template.manage')
    )
  );

drop policy if exists receipt_templates_delete on public.receipt_templates;
create policy receipt_templates_delete on public.receipt_templates
  for delete using (
    public.is_super_admin()
    or (
      public.current_access_ok()
      and school_id = public.current_school_id()
      and public.has_permission('finance.receipt_template.manage')
    )
  );

create or replace function public.seed_school_receipt_template_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.receipt_templates (school_id, name, content_html, content_css, is_default)
  values (
    new.id,
    'Template Kuitansi Standar',
    '<div class="receipt"><header><img data-receipt-logo alt="Logo sekolah"><div><h1>{{nama_sekolah}}</h1><p>{{alamat_sekolah}}</p><p>{{telepon_sekolah}}</p></div></header><div class="receipt-title"><h2>BUKTI PEMBAYARAN</h2><p>No. {{nomor_kuitansi}}</p></div><section class="identity"><p><strong>Nama Siswa</strong><span>{{nama_siswa}}</span></p><p><strong>Nomor Induk</strong><span>{{nomor_induk}}</span></p><p><strong>Tanggal Bayar</strong><span>{{tanggal_bayar}}</span></p></section><table><thead><tr><th>Rincian Biaya</th><th>Nominal</th></tr></thead><tbody>{{rincian_biaya}}</tbody><tfoot><tr><th>Total Pembayaran</th><th>{{nominal}}</th></tr></tfoot></table><p class="terbilang">Terbilang: <strong># {{terbilang}} #</strong></p><footer><p>{{kota}}, {{tanggal_bayar}}</p><p>Penerima,<br><br><strong>{{nama_petugas}}</strong></p></footer></div>',
    '.receipt{width:100%;max-width:760px;margin:0 auto;padding:32px;color:#21483b;font-family:Arial,sans-serif;font-size:13px}.receipt header{display:flex;gap:18px;align-items:center;border-bottom:2px solid #185743;padding-bottom:18px}.receipt header img{width:64px;height:64px;object-fit:contain}.receipt h1{margin:0;font-size:22px;color:#183d32}.receipt h2{margin:0;color:#185743;font-size:18px}.receipt p{margin:4px 0}.receipt-title{display:flex;justify-content:space-between;align-items:end;padding:22px 0 14px}.identity{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;border:1px solid #dfeae3;padding:14px;margin-bottom:18px}.identity p{display:flex;justify-content:space-between;gap:12px}.identity strong{color:#6c8279;font-size:11px}.receipt table{width:100%;border-collapse:collapse}.receipt th,.receipt td{border-bottom:1px solid #dfeae3;padding:10px 8px;text-align:left}.receipt th:last-child,.receipt td:last-child{text-align:right}.receipt tfoot th{border-top:2px solid #185743;border-bottom:0}.terbilang{margin-top:18px;padding:12px;background:#f4faf5}.receipt footer{display:flex;justify-content:space-between;text-align:center;margin-top:48px}@media print{.receipt{max-width:none;padding:0}.no-print{display:none!important}}',
    true
  )
  on conflict (school_id, name) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_schools_seed_receipt_templates on public.schools;
create trigger trg_schools_seed_receipt_templates
after insert on public.schools
for each row execute function public.seed_school_receipt_template_defaults();

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug = 'bendahara'
  and p.slug in ('finance.receipt_template.view', 'finance.receipt_template.manage')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug = 'kepala_sekolah'
  and p.slug = 'finance.receipt_template.view'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.is_system = true
  and r.slug = 'admin_sekolah'
  and p.slug in ('finance.receipt_template.view', 'finance.receipt_template.manage')
on conflict (role_id, permission_id) do nothing;

insert into public.receipt_templates (school_id, name, content_html, content_css, is_default)
select s.id, 'Template Kuitansi Standar',
  '<div class="receipt"><header><img data-receipt-logo alt="Logo sekolah"><div><h1>{{nama_sekolah}}</h1><p>{{alamat_sekolah}}</p><p>{{telepon_sekolah}}</p></div></header><div class="receipt-title"><h2>BUKTI PEMBAYARAN</h2><p>No. {{nomor_kuitansi}}</p></div><section class="identity"><p><strong>Nama Siswa</strong><span>{{nama_siswa}}</span></p><p><strong>Nomor Induk</strong><span>{{nomor_induk}}</span></p><p><strong>Kelas</strong><span>{{kelas}}</span></p><p><strong>Diterima Dari</strong><span>{{metode_pembayaran}}</span></p><p><strong>Tanggal Bayar</strong><span>{{tanggal_bayar}}</span></p></section><table><thead><tr><th>No</th><th>Jenis Biaya</th><th>Nominal</th></tr></thead><tbody>{{rincian_biaya}}</tbody><tfoot><tr><th colspan="2">Total Pembayaran</th><th>{{nominal}}</th></tr></tfoot></table><p class="terbilang">Terbilang: <strong># {{terbilang}} #</strong></p><footer><p>{{kota}}, {{tanggal_bayar}}</p><p>Kasir / Penerima,<br><br><strong>{{nama_petugas}}</strong></p></footer></div>',
  '.receipt{width:100%;max-width:760px;margin:0 auto;padding:32px;color:#21483b;font-family:Arial,sans-serif;font-size:13px}.receipt header{display:flex;gap:18px;align-items:center;border-bottom:2px solid #185743;padding-bottom:18px}.receipt header img{width:64px;height:64px;object-fit:contain}.receipt h1{margin:0;font-size:22px;color:#183d32}.receipt h2{margin:0;color:#185743;font-size:18px}.receipt p{margin:4px 0}.receipt-title{display:flex;justify-content:space-between;align-items:end;padding:22px 0 14px}.identity{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;border:1px solid #dfeae3;padding:14px;margin-bottom:18px}.identity p{display:flex;justify-content:space-between;gap:12px}.identity strong{color:#6c8279;font-size:11px}.receipt table{width:100%;border-collapse:collapse}.receipt th,.receipt td{border-bottom:1px solid #dfeae3;padding:10px 8px;text-align:left}.receipt th:last-child,.receipt td:last-child{text-align:right}.receipt tfoot th{border-top:2px solid #185743;border-bottom:0}.terbilang{margin-top:18px;padding:12px;background:#f4faf5}.receipt footer{display:flex;justify-content:space-between;text-align:center;margin-top:48px}@media print{.receipt{max-width:none;padding:0}.no-print{display:none!important}}', true
from public.schools s
where not exists (
  select 1 from public.receipt_templates rt
  where rt.school_id = s.id and rt.is_default = true
);

select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'receipt_templates'
order by ordinal_position;
