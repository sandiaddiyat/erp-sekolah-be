import { PERMISSIONS } from "@/lib/rbac";

export type NavIcon =
  | "dashboard"
  | "users"
  | "shield"
  | "school"
  | "pegawai"
  | "siswa"
  | "master";

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
  | "akses";

/** Urutan & label tampilan tiap grup menu. */
export const NAV_GROUPS: { key: NavGroupKey; label: string }[] = [
  { key: "beranda", label: "Beranda" },
  { key: "profil", label: "Profil Sekolah" },
  { key: "orang", label: "Manajemen Orang" },
  { key: "referensi", label: "Referensi" },
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
    title: "SPP & Keuangan",
    description: "Tagihan bulanan, pembayaran, dan tunggakan",
    permission: PERMISSIONS.financeView,
  },
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
