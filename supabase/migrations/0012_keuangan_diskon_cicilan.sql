-- =============================================================================
-- Modul SPP & Keuangan (Issue #17) - Tahap 2: Diskon/Beasiswa & Cicilan
-- =============================================================================
-- 1. Diskon: kolom diskon + diskon_keterangan di bills (beasiswa cukup
--    dicatat di keterangan). Total tagihan = nominal - diskon.
-- 2. Cicilan: status baru `cicilan` — bill lunas hanya bila total pembayaran
--    terverifikasi >= total setelah diskon (logika di service layer).
-- =============================================================================

alter table public.bills
  add column if not exists diskon numeric(12,2) not null default 0;

alter table public.bills
  add column if not exists diskon_keterangan varchar(200);

-- Diskon tidak boleh negatif dan tidak boleh melampaui nominal.
alter table public.bills drop constraint if exists bills_diskon_check;
alter table public.bills
  add constraint bills_diskon_check check (diskon >= 0 and diskon <= nominal);

-- Tambahkan status `cicilan` ke constraint status.
alter table public.bills drop constraint if exists bills_status_check;
alter table public.bills
  add constraint bills_status_check check (status in ('belum_bayar','menunggu_verifikasi','cicilan','lunas','batal'));
