-- =============================================================================
-- Modul Data Siswa (Issue #90) - Tahap 1: Tambah kolom CSV standar
-- =============================================================================
-- Menambahkan kolom-kolom siswa sesuai format CSV standar sekolah:
-- data diri lengkap (nama panggilan, status dalam keluarga, anak ke),
-- alamat terpisah (Dusun, RT, RW, Desa, Kecamatan, Kabupaten),
-- data orang tua lengkap (pekerjaan, alamat, telepon rumah),
-- data wali lengkap (pekerjaan, alamat).
-- =============================================================================

alter table public.students
  add column if not exists nama_panggilan varchar(100),
  add column if not exists status_dalam_keluarga varchar(50),
  add column if not exists anak_ke integer,
  add column if not exists alamat_dusun varchar(150),
  add column if not exists alamat_rt varchar(10),
  add column if not exists alamat_rw varchar(10),
  add column if not exists alamat_desa varchar(150),
  add column if not exists alamat_kecamatan varchar(150),
  add column if not exists alamat_kabupaten_kota varchar(150),
  add column if not exists pekerjaan_ayah varchar(150),
  add column if not exists pekerjaan_ibu varchar(150),
  add column if not exists no_telp_rumah varchar(30),
  add column if not exists alamat_ortu_dusun varchar(150),
  add column if not exists alamat_ortu_rt varchar(10),
  add column if not exists alamat_ortu_rw varchar(10),
  add column if not exists alamat_ortu_desa varchar(150),
  add column if not exists alamat_ortu_kecamatan varchar(150),
  add column if not exists alamat_ortu_kabupaten_kota varchar(150),
  add column if not exists nama_wali varchar(150),
  add column if not exists pekerjaan_wali varchar(150),
  add column if not exists no_telp_wali varchar(30),
  add column if not exists alamat_wali_dusun varchar(150),
  add column if not exists alamat_wali_rt varchar(10),
  add column if not exists alamat_wali_rw varchar(10),
  add column if not exists alamat_wali_desa varchar(150);
