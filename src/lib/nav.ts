import { PERMISSIONS } from "@/lib/rbac";

export type NavIcon =
  | "dashboard"
  | "users"
  | "shield"
  | "school"
  | "pegawai"
  | "master";

export type NavItem = {
  title: string;
  href: string;
  icon: NavIcon;
  /** Kosong berarti selalu tampil untuk semua user yang sudah login. */
  permission?: string;
  /** Hanya tampil untuk super admin platform. */
  superAdminOnly?: boolean;
};

export const MAIN_NAV: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
  },
  {
    title: "Sekolah",
    href: "/sekolah",
    icon: "school",
    superAdminOnly: true,
  },
  {
    title: "Data Pegawai",
    href: "/pegawai",
    icon: "pegawai",
    permission: PERMISSIONS.pegawaiView,
  },
  {
    title: "Master Data",
    href: "/master",
    icon: "master",
    permission: PERMISSIONS.masterView,
  },
  {
    title: "User",
    href: "/users",
    icon: "users",
    permission: PERMISSIONS.usersView,
  },
  {
    title: "Role & Hak Akses",
    href: "/roles",
    icon: "shield",
    permission: PERMISSIONS.rolesView,
  },
];

export type PlannedModule = {
  title: string;
  description: string;
  permission: string;
};

export const PLANNED_MODULES: PlannedModule[] = [
  {
    title: "Data Siswa",
    description: "Biodata, wali murid, dan riwayat kelas",
    permission: PERMISSIONS.studentsView,
  },
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
