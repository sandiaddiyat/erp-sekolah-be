export type SchoolStatus = "trial" | "active" | "suspended";

export type School = {
  id: string;
  name: string;
  slug: string;
  npsn: string | null;
  level: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  status: SchoolStatus;
  active_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SchoolWithCounts = School & {
  user_count: number;
  role_count: number;
  notes: string;
};

export type Profile = {
  id: string;
  school_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  jabatan: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  school_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type Permission = {
  id: string;
  module: string;
  action: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type RoleWithCounts = Role & {
  permission_count: number;
  user_count: number;
};

export type UserWithRoles = Profile & {
  roles: Pick<Role, "id" | "name" | "slug">[];
};

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: Profile;
  school: School | null;
  roles: Pick<Role, "id" | "name" | "slug">[];
  permissions: string[];
  isSuperAdmin: boolean;
};

/** Hasil kembalian standar untuk semua Server Action (form submission). */
export type FormState = { error?: string; success?: string } | undefined;

// =============================================================================
// Master data (Issue #13)
// =============================================================================

export type WilayahLevel = "provinsi" | "kabupaten" | "kecamatan" | "kelurahan";

export type Wilayah = {
  id: string;
  kode_wilayah: string;
  nama_wilayah: string;
  level: WilayahLevel;
  parent_id: string | null;
};

export type Agama = { id: string; nama_agama: string };
export type Bank = { id: string; nama_bank: string; kode_bank: string | null };

export type JenisDokumen = {
  id: string;
  nama_dokumen: string;
  wajib_unggah: boolean;
};

export type JenjangPendidikan = { id: string; nama_jenjang: string };

export type StatusKepegawaian = {
  id: string;
  school_id: string;
  nama_status: string;
};

export type JabatanKategori = "struktural" | "fungsional";

export type Jabatan = {
  id: string;
  school_id: string;
  nama_jabatan: string;
  kategori: JabatanKategori;
};

export type Golongan = {
  id: string;
  school_id: string;
  kode_golongan: string;
  keterangan: string | null;
};

export type UnitKerja = {
  id: string;
  school_id: string;
  nama_unit: string;
  parent_unit_id: string | null;
};

export type Mapel = {
  id: string;
  school_id: string;
  nama_mapel: string;
  kode_mapel: string;
};

export type Jurusan = {
  id: string;
  school_id: string | null;
  nama_jurusan: string;
};

export type JenisSertifikasi = {
  id: string;
  school_id: string;
  nama_sertifikasi: string;
};

export type JenisCutiIzin = {
  id: string;
  school_id: string;
  nama_jenis: string;
  kuota_hari: number | null;
};

export type TahunAjaranSemester = "ganjil" | "genap";

export type TahunAjaran = {
  id: string;
  school_id: string;
  nama_tahun_ajaran: string;
  semester: TahunAjaranSemester;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  status_aktif: boolean;
};

// =============================================================================
// Pegawai (Issue #13)
// =============================================================================

export type Pegawai = {
  id: string;
  school_id: string;
  user_id: string | null;
  nip: string | null;
  niy: string | null;
  nuptk: string | null;
  full_name: string;
  jenis_kelamin: "L" | "P" | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama_id: string | null;
  status_kepegawaian_id: string | null;
  jabatan_id: string | null;
  golongan_id: string | null;
  unit_kerja_id: string | null;
  pendidikan_terakhir_id: string | null;
  tahun_masuk: string | null;
  alamat: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

// =============================================================================
// Multi-jabatan pegawai (Issue #19)
// =============================================================================

export type PegawaiJabatan = {
  id: string;
  school_id: string;
  pegawai_id: string;
  jabatan_id: string;
  is_utama: boolean;
};

// =============================================================================
// Detail pegawai: pendidikan & sertifikasi multi-baris (Issue #21)
// =============================================================================

export type PegawaiPendidikan = {
  id: string;
  school_id: string;
  pegawai_id: string;
  jenjang_pendidikan_id: string | null;
  jurusan: string | null;
  nama_institusi: string | null;
  tahun_lulus: string | null;
};

export type PegawaiSertifikasi = {
  id: string;
  school_id: string;
  pegawai_id: string;
  nama_sertifikasi: string;
  tanggal_berlaku: string | null;
  tanggal_kedaluwarsa: string | null;
  nomor_sertifikat: string | null;
  penerbit: string | null;
};

// =============================================================================
// Siswa (Issue #15)
// =============================================================================

export type SiswaStatus = "aktif" | "lulus" | "pindah" | "keluar";

export type Siswa = {
  id: string;
  school_id: string;
  user_id: string | null;
  nis: string | null;
  nisn: string | null;
  nama_lengkap: string;
  jenis_kelamin: "L" | "P" | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  agama_id: string | null;
  alamat: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  nama_wali: string | null;
  telepon_wali: string | null;
  status: SiswaStatus;
};

// =============================================================================
// Keuangan (Issue #17)
// =============================================================================

export type BillStatus =
  | "belum_bayar"
  | "menunggu_verifikasi"
  | "cicilan"
  | "lunas"
  | "batal";

export type BillFrekuensi = "sekali" | "bulanan" | "tahunan";

export type PaymentMetode = "transfer" | "tunai" | "qris";

export type PaymentStatus = "menunggu" | "terverifikasi" | "ditolak";

export type BillItem = {
  id: string;
  school_id: string;
  nama_item: string;
  nominal: number;
  frekuensi: BillFrekuensi;
};

export type Bill = {
  id: string;
  school_id: string;
  student_id: string;
  bill_item_id: string | null;
  deskripsi: string;
  nominal: number;
  diskon: number;
  diskon_keterangan: string | null;
  jatuh_tempo: string | null;
  status: BillStatus;
};

export type BillWithStudent = Bill & {
  student_nama: string | null;
};

export type Payment = {
  id: string;
  school_id: string;
  bill_id: string;
  dicatat_oleh: string;
  nominal: number;
  metode: PaymentMetode;
  bukti_url: string | null;
  catatan: string | null;
  status: PaymentStatus;
  diverifikasi_oleh: string | null;
  diverifikasi_pada: string | null;
};

