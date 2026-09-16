-- =============================================================================
-- Modul SPP & Keuangan (Issue #17) - Tahap 1: Tabel keuangan
-- =============================================================================
-- Tiga tabel: bill_items (katalog jenis tagihan), bills (tagihan per siswa),
-- payments (riwayat pembayaran/konfirmasi).
-- Permission finance.* SUDAH ada di katalog sejak 0002_seed_rbac.sql,
-- jadi tidak ada seed permission di sini.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Katalog jenis tagihan per sekolah
-- -----------------------------------------------------------------------------
create table if not exists public.bill_items (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  nama_item   varchar(100) not null,
  nominal     numeric(12,2) not null check (nominal >= 0),
  frekuensi   text not null default 'sekali' check (frekuensi in ('sekali','bulanan','tahunan')),
  created_at  timestamptz not null default now()
);

create unique index if not exists uq_bill_items_tenant on public.bill_items (school_id, nama_item);

-- -----------------------------------------------------------------------------
-- Tagihan per siswa
-- -----------------------------------------------------------------------------
create table if not exists public.bills (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  bill_item_id  uuid references public.bill_items(id) on delete set null,
  deskripsi     varchar(200) not null,
  nominal       numeric(12,2) not null check (nominal > 0),
  jatuh_tempo   date,
  status        text not null default 'belum_bayar' check (status in ('belum_bayar','menunggu_verifikasi','lunas','batal')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (school_id, student_id, bill_item_id, deskripsi)
);

create index if not exists idx_bills_school on public.bills (school_id);
create index if not exists idx_bills_student on public.bills (school_id, student_id);
create index if not exists idx_bills_status on public.bills (school_id, status);

-- -----------------------------------------------------------------------------
-- Pembayaran / konfirmasi
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools(id) on delete cascade,
  bill_id             uuid not null references public.bills(id) on delete cascade,
  dicatat_oleh        uuid not null references public.profiles(id),
  nominal             numeric(12,2) not null check (nominal > 0),
  metode              text not null check (metode in ('transfer','tunai','qris')),
  bukti_url           text,
  catatan             text,
  status              text not null default 'menunggu' check (status in ('menunggu','terverifikasi','ditolak')),
  diverifikasi_oleh   uuid references public.profiles(id),
  diverifikasi_pada   timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_payments_school on public.payments (school_id);
create index if not exists idx_payments_bill on public.payments (bill_id);
create index if not exists idx_payments_status on public.payments (school_id, status);

-- -----------------------------------------------------------------------------
-- Trigger updated_at (fungsi set_updated_at sudah ada dari 0009)
-- -----------------------------------------------------------------------------
drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

-- ----- bill_items: tulis hanya yang boleh membuat tagihan -----
alter table public.bill_items enable row level security;

drop policy if exists bill_items_select on public.bill_items;
create policy bill_items_select on public.bill_items
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bill_items_insert on public.bill_items;
create policy bill_items_insert on public.bill_items
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.bill_create')));

drop policy if exists bill_items_update on public.bill_items;
create policy bill_items_update on public.bill_items
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.bill_create')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bill_items_delete on public.bill_items;
create policy bill_items_delete on public.bill_items
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.bill_create')));

-- ----- bills: buat tagihan = bill_create; ubah status = bill_create + payment_verify -----
alter table public.bills enable row level security;

drop policy if exists bills_select on public.bills;
create policy bills_select on public.bills
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bills_insert on public.bills;
create policy bills_insert on public.bills
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.bill_create')));

drop policy if exists bills_update on public.bills;
create policy bills_update on public.bills
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and (public.has_permission('finance.bill_create') or public.has_permission('finance.payment_verify'))))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists bills_delete on public.bills;
create policy bills_delete on public.bills
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.bill_create')));

-- ----- payments: catat = payment_create; verifikasi = payment_verify -----
alter table public.payments enable row level security;

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
  for insert to authenticated
  with check (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.payment_create')));

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.payment_verify')))
  with check (public.is_super_admin() or school_id = public.current_school_id());

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments
  for delete to authenticated
  using (public.is_super_admin() or (school_id = public.current_school_id() and public.has_permission('finance.payment_verify')));
