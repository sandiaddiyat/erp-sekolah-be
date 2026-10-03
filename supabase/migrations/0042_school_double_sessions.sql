-- =============================================================================
-- Pengaturan Sesi Ganda (lanjutan Issue #100)
-- =============================================================================
-- Menandai apakah sekolah menggunakan sesi masuk ganda (pagi/siang).
-- Saat aktif, form kelas menampilkan pilihan shift. Default: nonaktif.
-- =============================================================================

alter table public.schools
  add column if not exists has_double_sessions boolean not null default false;
