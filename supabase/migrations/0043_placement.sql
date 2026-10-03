-- =============================================================================
-- Penempatan Siswa ke Kelas (Issue #104)
-- =============================================================================
-- Menambahkan kolom placement_status pada tabel student_enrollments untuk
-- mendukung mode draft + finalisasi (Tahap 2 semi-otomatis).
-- =============================================================================

alter table public.student_enrollments
  add column if not exists placement_status text not null default 'final';

alter table public.student_enrollments
  add constraint student_enrollments_placement_status_check
    check (placement_status in ('draft', 'final'));

create index if not exists student_enrollments_placement_status_school_idx
  on public.student_enrollments (school_id, placement_status);
