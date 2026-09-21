-- =============================================================================
-- ERP Sekolah - Katalog permission & role default
-- =============================================================================
-- Katalog permission sengaja dibuat lengkap sejak awal (termasuk modul yang
-- belum dibangun) supaya UI manajemen role sudah bisa dipakai mengatur akses
-- untuk modul-modul berikutnya: siswa, guru, kelas, keuangan, akademik.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Katalog permission
-- -----------------------------------------------------------------------------
insert into public.permissions (module, action, slug, name, description)
select
  v.module,
  v.action,
  v.module || '.' || v.action,
  v.name,
  v.description
from (
  values
    ('dashboard', 'view',              'Lihat Dashboard',            'Melihat halaman dashboard'),
    ('users',     'view',              'Lihat User',                 'Melihat daftar user'),
    ('users',     'create',            'Tambah User',                'Membuat akun user baru'),
    ('users',     'update',            'Ubah User',                  'Mengubah data user'),
    ('users',     'delete',            'Hapus User',                 'Menghapus / menonaktifkan user'),
    ('users',     'assign_role',       'Atur Role User',             'Memberikan role kepada user'),
    ('roles',     'view',              'Lihat Role',                 'Melihat daftar role'),
    ('roles',     'create',            'Tambah Role',                'Membuat role baru'),
    ('roles',     'update',            'Ubah Role',                  'Mengubah role dan hak aksesnya'),
    ('roles',     'delete',            'Hapus Role',                 'Menghapus role'),
    ('schools',   'view',              'Lihat Sekolah',              'Melihat profil sekolah'),
    ('schools',   'update',            'Ubah Sekolah',               'Mengubah profil sekolah'),
    ('students',  'view',              'Lihat Siswa',                'Melihat data siswa'),
    ('students',  'create',            'Tambah Siswa',               'Menambah data siswa'),
    ('students',  'update',            'Ubah Siswa',                 'Mengubah data siswa'),
    ('students',  'delete',            'Hapus Siswa',                'Menghapus data siswa'),
    ('students',  'import',            'Impor Siswa',                'Impor data siswa massal'),
    ('teachers',  'view',              'Lihat Guru',                 'Melihat data guru'),
    ('teachers',  'create',            'Tambah Guru',                'Menambah data guru'),
    ('teachers',  'update',            'Ubah Guru',                  'Mengubah data guru'),
    ('teachers',  'delete',            'Hapus Guru',                 'Menghapus data guru'),
    ('classes',   'view',              'Lihat Kelas',                'Melihat data kelas / rombel'),
    ('classes',   'create',            'Tambah Kelas',               'Menambah kelas / rombel'),
    ('classes',   'update',            'Ubah Kelas',                 'Mengubah kelas / rombel'),
    ('classes',   'delete',            'Hapus Kelas',                'Menghapus kelas / rombel'),
    ('finance',   'view',              'Lihat Keuangan',             'Melihat data keuangan'),
    ('finance',   'bill_create',       'Buat Tagihan',               'Membuat tagihan SPP / lainnya'),
    ('finance',   'payment_create',    'Input Pembayaran',           'Mencatat pembayaran masuk'),
    ('finance',   'payment_verify',    'Verifikasi Pembayaran',      'Memverifikasi pembayaran'),
    ('finance',   'report_view',       'Laporan Keuangan',         'Melihat laporan keuangan'),
    ('finance',   'bill_item_view',    'Lihat Jenis Tagihan',      'Melihat katalog jenis tagihan'),
    ('finance',   'bill_item_manage',  'Kelola Jenis Tagihan',      'Menambah dan menghapus jenis tagihan'),
    ('academics', 'view',              'Lihat Akademik',             'Melihat data akademik'),
    ('academics', 'attendance_manage', 'Kelola Absensi',             'Mengelola absensi siswa'),
    ('academics', 'grade_manage',      'Kelola Nilai',               'Mengelola nilai siswa'),
    ('academics', 'report_card_publish','Terbitkan Rapor',           'Menerbitkan rapor siswa'),
    ('fee_structure', 'view',        'Lihat Skema Biaya',           'Melihat skema biaya'),
    ('fee_structure', 'manage',      'Kelola Skema Biaya',           'Membuat dan mengelola skema biaya'),
    ('billing',     'view',          'Lihat Billing',                'Melihat job dan laporan billing otomatis'),
    ('billing',     'manage',        'Kelola Billing',               'Menjalankan job billing'),
    ('discount',    'view',          'Lihat Diskon',                 'Melihat daftar diskon & beasiswa'),
    ('discount',    'manage',        'Kelola Diskon',                'Mengatur diskon & alur approval'),
    ('reports',   'view',              'Lihat Laporan',              'Melihat laporan umum'),
    ('settings',  'view',              'Lihat Pengaturan',           'Melihat pengaturan aplikasi'),
    ('settings',  'update',            'Ubah Pengaturan',            'Mengubah pengaturan aplikasi')
) as v(module, action, name, description)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Fungsi: buat 4 role default untuk sebuah sekolah
-- -----------------------------------------------------------------------------
create or replace function public.create_default_roles(p_school_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
begin
  -- ===== Administrator Sekolah: seluruh permission =====
  insert into public.roles (school_id, name, slug, description, is_system)
  values (
    p_school_id,
    'Administrator Sekolah',
    'admin_sekolah',
    'Akses penuh terhadap seluruh modul di sekolah ini',
    true
  )
  on conflict (school_id, slug)
    do update set name = excluded.name, description = excluded.description
  returning id into v_role_id;

  delete from public.role_permissions where role_id = v_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, p.id from public.permissions p
  on conflict do nothing;

  -- ===== Kepala Sekolah: akses baca menyeluruh + laporan =====
  insert into public.roles (school_id, name, slug, description, is_system)
  values (
    p_school_id,
    'Kepala Sekolah',
    'kepala_sekolah',
    'Melihat seluruh data dan laporan sebagai bahan pengawasan',
    true
  )
  on conflict (school_id, slug)
    do update set name = excluded.name, description = excluded.description
  returning id into v_role_id;

  delete from public.role_permissions where role_id = v_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, p.id
  from public.permissions p
  where p.action = 'view'
     or p.slug = 'finance.report_view'
     or p.slug = 'finance.bill_item_view'
     or p.slug = 'fee_structure.view'
     or p.slug = 'billing.view'
     or p.slug = 'discount.view'
  on conflict do nothing;

  -- ===== Staf TU: administrasi siswa, guru, kelas, absensi =====
  insert into public.roles (school_id, name, slug, description, is_system)
  values (
    p_school_id,
    'Staf Tata Usaha',
    'staf_tu',
    'Mengelola data siswa, guru, kelas, dan absensi',
    true
  )
  on conflict (school_id, slug)
    do update set name = excluded.name, description = excluded.description
  returning id into v_role_id;

  delete from public.role_permissions where role_id = v_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, p.id
  from public.permissions p
  where p.slug = any (array[
    'dashboard.view',
    'students.view', 'students.create', 'students.update', 'students.delete', 'students.import',
    'teachers.view',
    'classes.view', 'classes.create', 'classes.update', 'classes.delete',
    'academics.view', 'academics.attendance_manage',
    'reports.view'
  ])
  on conflict do nothing;

  -- ===== Bendahara / Keuangan: tagihan & pembayaran =====
  insert into public.roles (school_id, name, slug, description, is_system)
  values (
    p_school_id,
    'Bendahara / Keuangan',
    'bendahara',
    'Mengelola tagihan, pembayaran, dan laporan keuangan',
    true
  )
  on conflict (school_id, slug)
    do update set name = excluded.name, description = excluded.description
  returning id into v_role_id;

  delete from public.role_permissions where role_id = v_role_id;
  insert into public.role_permissions (role_id, permission_id)
  select v_role_id, p.id
  from public.permissions p
   where p.slug = any (array[
    'dashboard.view',
    'students.view',
    'finance.view', 'finance.bill_create', 'finance.payment_create',
    'finance.payment_verify', 'finance.report_view',
    'finance.bill_item_view', 'finance.bill_item_manage',
    'fee_structure.view',
    'billing.view', 'billing.manage',
    'discount.view', 'discount.manage',
    'reports.view'
  ])
  on conflict do nothing;
end;
$$;
