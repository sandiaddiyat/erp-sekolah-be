/**
 * Daftar slug permission. Harus SAMA dengan isi tabel `permissions`
 * (lihat supabase/migrations/0002_seed_rbac.sql).
 */
export const PERMISSIONS = {
  dashboardView: "dashboard.view",

  usersView: "users.view",
  usersCreate: "users.create",
  usersUpdate: "users.update",
  usersDelete: "users.delete",
  usersAssignRole: "users.assign_role",

  rolesView: "roles.view",
  rolesCreate: "roles.create",
  rolesUpdate: "roles.update",
  rolesDelete: "roles.delete",

  schoolsView: "schools.view",
  schoolsUpdate: "schools.update",

  masterView: "master.view",
  masterManage: "master.manage",

  pegawaiView: "pegawai.view",
  pegawaiCreate: "pegawai.create",
  pegawaiUpdate: "pegawai.update",
  pegawaiDelete: "pegawai.delete",

  studentsView: "students.view",
  studentsCreate: "students.create",
  studentsUpdate: "students.update",
  studentsDelete: "students.delete",
  studentsImport: "students.import",

  teachersView: "teachers.view",
  teachersCreate: "teachers.create",
  teachersUpdate: "teachers.update",
  teachersDelete: "teachers.delete",

  classesView: "classes.view",
  classesCreate: "classes.create",
  classesUpdate: "classes.update",
  classesDelete: "classes.delete",

  financeView: "finance.view",
  financeBillCreate: "finance.bill_create",
  financePaymentCreate: "finance.payment_create",
  financePaymentVerify: "finance.payment_verify",
  financeReportView: "finance.report_view",

  academicsView: "academics.view",
  academicsAttendanceManage: "academics.attendance_manage",
  academicsGradeManage: "academics.grade_manage",
  academicsReportCardPublish: "academics.report_card_publish",

  reportsView: "reports.view",

  settingsView: "settings.view",
  settingsUpdate: "settings.update",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Label modul untuk pengelompokan di UI manajemen role. */
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  users: "Manajemen User",
  roles: "Manajemen Role",
  schools: "Profil Sekolah",
  master: "Master Data",
  pegawai: "Data Pegawai",
  students: "Data Siswa",
  teachers: "Data Guru",
  classes: "Kelas & Rombel",
  finance: "Keuangan",
  academics: "Akademik",
  reports: "Laporan",
  settings: "Pengaturan",
};

/** Urutan tampil modul di UI. Modul di luar daftar ini ditaruh paling bawah. */
export const MODULE_ORDER: string[] = [
  "dashboard",
  "users",
  "roles",
  "schools",
  "pegawai",
  "master",
  "students",
  "teachers",
  "classes",
  "finance",
  "academics",
  "reports",
  "settings",
];

export function can(
  permissions: string[] | undefined | null,
  slug: string,
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (!permissions) return false;
  return permissions.includes(slug);
}

export function canAny(
  permissions: string[] | undefined | null,
  slugs: string[],
  isSuperAdmin = false
): boolean {
  if (isSuperAdmin) return true;
  if (!permissions) return false;
  return slugs.some((slug) => permissions.includes(slug));
}

export function moduleOf(slug: string): string {
  return slug.split(".")[0] ?? "lainnya";
}

export function actionOf(slug: string): string {
  return slug.split(".")[1] ?? "";
}
