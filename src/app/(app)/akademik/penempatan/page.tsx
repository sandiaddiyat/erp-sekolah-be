import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Class as SchoolClass, Grade } from "@/lib/types";
import { PenempatanClient } from "./penempatan-client";

export const metadata = { title: "Penempatan Siswa" };

export default async function PenempatanPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [yearsResult, classesResult, gradesResult, draftCountResult] =
    await Promise.all([
      supabase
        .from("academic_years")
        .select("id, school_id, name, start_date, end_date, status, is_active, created_at, updated_at")
        .eq("school_id", schoolId)
        .order("start_date", { ascending: false }),
      supabase
        .from("classes")
        .select("id, name, academic_year_id, grade_id, capacity")
        .eq("school_id", schoolId)
        .order("name"),
      supabase
        .from("grades")
        .select("id, name, education_level_id, sort_order")
        .eq("school_id", schoolId)
        .order("sort_order"),
      supabase
        .from("student_enrollments")
        .select("id")
        .eq("school_id", schoolId)
        .eq("placement_status", "draft"),
    ]);

  if (yearsResult.error || classesResult.error || gradesResult.error) {
    return <DataError message="Gagal memuat data penempatan." />;
  }

  // Non-fatal: fallback 0 bila migration placement_status belum diterapkan.
  const draftCount = draftCountResult.error ? 0 : (draftCountResult.data ?? []).length;

  return (
    <PenempatanClient
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      classes={(classesResult.data ?? []) as unknown as SchoolClass[]}
      grades={(gradesResult.data ?? []) as unknown as Grade[]}
      draftCount={draftCount}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}