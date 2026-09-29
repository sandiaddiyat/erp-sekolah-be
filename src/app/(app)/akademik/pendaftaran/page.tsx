import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { StudentEnrollment, AcademicYear, Class as SchoolClass, Siswa } from "@/lib/types";
import { PendaftaranClient } from "./pendaftaran-client";

export const metadata = { title: "Penempatan Kelas" };

export default async function PendaftaranPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [enrollmentsResult, yearsResult, classesResult, studentsResult] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("*, students!student_enrollments_student_tenant_fkey(nama_lengkap), classes!student_enrollments_class_tenant_fkey(name), academic_years!student_enrollments_year_tenant_fkey(name)")
      .eq("school_id", schoolId)
      .order("enrollment_date", { ascending: false }),
    supabase
      .from("academic_years")
      .select("id, school_id, name, start_date, end_date, status, is_active, created_at, updated_at")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase.from("classes").select("id, name, academic_years!classes_academic_year_tenant_fkey(name)").eq("school_id", schoolId).order("name"),
    supabase
      .from("students")
      .select("id, school_id, nis, nisn, nama_lengkap, jenis_kelamin, status")
      .eq("school_id", schoolId)
      .eq("status", "aktif")
      .order("nama_lengkap"),
  ]);

  if (enrollmentsResult.error || yearsResult.error || classesResult.error || studentsResult.error) {
    return <DataError message="Gagal memuat data pendaftaran." />;
  }

  const classByStudentId: Record<string, string> = {};
  for (const enrollment of (enrollmentsResult.data ?? []) as Array<{
    student_id: string;
    enrollment_date: string;
    classes?: { name?: string | null } | null;
  }>) {
    if (!classByStudentId[enrollment.student_id] && enrollment.classes?.name) {
      classByStudentId[enrollment.student_id] = enrollment.classes.name;
    }
  }

  return (
    <PendaftaranClient
      enrollments={(enrollmentsResult.data ?? []) as StudentEnrollment[]}
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      classes={(classesResult.data ?? []) as unknown as SchoolClass[]}
      students={(studentsResult.data ?? []) as Siswa[]}
      classByStudentId={classByStudentId}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
