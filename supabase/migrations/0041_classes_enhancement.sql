-- =============================================================================
-- Master Kelas (Issue #100) - Perubahan additive pada tabel classes
-- =============================================================================
-- Menambahkan kolom-kolom baru agar master kelas lebih lengkap:
-- kode internal kelas (class_code), status (aktif/nonaktif/arsip),
-- shift (pagi/siang, untuk sekolah sesi ganda), dan audit created_by.
-- Semua perubahan bersifat menambah (additive), tidak mengubah kolom yang ada.
-- =============================================================================

alter table public.classes
  add column if not exists class_code varchar(50),
  add column if not exists status text not null default 'aktif',
  add column if not exists shift text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.classes
  add constraint classes_status_check check (status in ('aktif', 'nonaktif', 'arsip')),
  add constraint classes_shift_check check (shift in ('pagi', 'siang'));

-- Kode kelas unik per sekolah (multi-tenant). Null boleh lebih dari sekali.
create unique index if not exists classes_class_code_school_key
  on public.classes (school_id, class_code)
  where class_code is not null;

-- Cegah nama kelas ganda di tingkat & tahun ajaran yang sama.
-- academic_year_id sudah menentukan school_id via composite FK,
-- jadi constraint 3 kolom ini sudah cukup untuk isolasi tenant.
-- NOTE: jika data lama sudah mengandung duplikat, jalankan cleanup dulu
-- sebelum migrasi ini (index creation akan gagal dengan pesan jelas).
create unique index if not exists classes_year_grade_name_key
  on public.classes (academic_year_id, grade_id, name);

-- classes belum punya trigger updated_at sejak migrasi 0018 — tambahkan sekarang.
drop trigger if exists trg_classes_updated_at on public.classes;
create trigger trg_classes_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();
