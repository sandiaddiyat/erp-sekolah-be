import { PERMISSIONS } from "@/lib/rbac";

export type NavIcon =
  | "dashboard"
  | "users"
  | "shield"
  | "school"
  | "pegawai"
  | "siswa"
  | "master"
  | "keuangan";

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  /** Kosong berarti selalu tampil untuk semua user yang sudah login. */
  permission?: string;
  /** Hanya tampil untuk super admin platform. */
  superAdminOnly?: boolean;
  /** Kunci grup fungsional tempat item ini ditampilkan di sidebar. */
  group: NavGroupKey;
};

/** Kunci grup menu sidebar, disusun menurut fungsi masing-masing modul. */
export type NavGroupKey =
  | "beranda"
  | "profil"
  | "orang"
  | "referensi"
  | "keuangan"
  | "tagihan"
  | "diskon"
  | "akses";

/** Urutan & label tampilan tiap grup menu. */
export const NAV_GROUPS: { key: NavGroupKey; label: string }[] = [
  { key: "beranda", label: "Beranda" },
  { key: "profil", label: "Profil Sekolah" },
  { key: "orang", label: "Manajemen Orang" },
  { key: "referensi", label: "Referensi" },
  { key: "keuangan", label: "Keuangan" },
  { key: "tagihan", label: "Tagihan Otomatis" },
  { key: "diskon", label: "Diskon & Beasiswa" },
  { key: "akses", label: "Penggunaan & Akses" },
];

export const MAIN_NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    group: "beranda",
  },
  {
    title: "Sekolah",
    href: "/sekolah",
    icon: "school",
    superAdminOnly: true,
    group: "profil",
  },
  {
    title: "Data Pegawai",
    href: "/pegawai",
    icon: "pegawai",
    permission: PERMISSIONS.pegawaiView,
    group: "orang",
  },
  {
    title: "Data Siswa",
    href: "/siswa",
    icon: "siswa",
    permission: PERMISSIONS.studentsView,
    group: "orang",
  },
  {
    title: "Master Data",
    href: "/master",
    icon: "master",
    permission: PERMISSIONS.masterView,
    group: "referensi",
  },
  {
    title: "SPP & Keuangan",
    href: "/keuangan",
    icon: "keuangan",
    permission: PERMISSIONS.financeView,
    group: "keuangan",
  },
  {
    title: "Jenis Tagihan",
    href: "/keuangan/jenis-tagihan",
    icon: "keuangan",
    permission: PERMISSIONS.financeBillItemView,
    group: "keuangan",
  },
  {
    title: "Skema Biaya",
    href: "/keuangan/skema-biaya",
    icon: "keuangan",
    permission: PERMISSIONS.feeStructureView,
    group: "tagihan",
  },
  {
    title: "Tagihan Otomatis",
    href: "/keuangan/tagihan-otomatis",
    icon: "keuangan",
    permission: PERMISSIONS.billingView,
    group: "tagihan",
  },
  {
    title: "Rekonsiliasi",
    href: "/keuangan/rekonsiliasi",
    icon: "keuangan",
    permission: PERMISSIONS.billingView,
    group: "tagihan",
  },
  {
    title: "Diskon & Beasiswa",
    href: "/keuangan/diskon",
    icon: "keuangan",
    permission: PERMISSIONS.discountView,
    group: "diskon",
  },
  {
    title: "Akademik",
    href: "/akademik/tahun-ajaran",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "Jenjang",
    href: "/akademik/jenjang",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "Tingkat",
    href: "/akademik/tingkat",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "Jurusan",
    href: "/akademik/jurusan",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "Ruangan",
    href: "/akademik/ruangan",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "Kelas",
    href: "/akademik/kelas",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "Pendaftaran Siswa",
    href: "/akademik/pendaftaran",
    icon: "siswa",
    permission: PERMISSIONS.academicsView,
    group: "referensi",
  },
  {
    title: "User",
    href: "/users",
    icon: "users",
    permission: PERMISSIONS.usersView,
    group: "akses",
  },
  {
    title: "Role & Hak Akses",
    href: "/roles",
    icon: "shield",
    permission: PERMISSIONS.rolesView,
    group: "akses",
  },
];

export type PlannedModule = {
  title: string;
  description: string;
  permission: string;
};

export const PLANNED_MODULES: PlannedModule[] = [
  {
    title: "Absensi & Nilai",
    description: "Kehadiran harian dan rapor siswa",
    permission: PERMISSIONS.academicsView,
  },
  {
    title: "Profil Sekolah",
    description: "Identitas, tahun ajaran, dan pengaturan",
    permission: PERMISSIONS.settingsView,
  },
];
