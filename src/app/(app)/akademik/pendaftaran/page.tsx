import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { StudentEnrollment, AcademicYear, Class as SchoolClass, Siswa } from "@/lib/types";
import { PendaftaranClient } from "./pendaftaran-client";

export const metadata = { title: "Pendaftaran Siswa" };

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
    supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase.from("classes").select("id, name, academic_years!classes_academic_year_tenant_fkey(name)").eq("school_id", schoolId).order("name"),
    supabase.from("students").select("id, nama_lengkap").eq("school_id", schoolId).order("nama_lengkap"),
  ]);

  if (enrollmentsResult.error || yearsResult.error || classesResult.error || studentsResult.error) {
    return <DataError message="Gagal memuat data pendaftaran." />;
  }

  return (
    <PendaftaranClient
      enrollments={(enrollmentsResult.data ?? []) as StudentEnrollment[]}
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      classes={(classesResult.data ?? []) as unknown as SchoolClass[]}
      students={(studentsResult.data ?? []) as Siswa[]}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
