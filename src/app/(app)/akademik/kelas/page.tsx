import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type {
  Class as SchoolClass,
  EducationLevel,
  Grade,
  Major,
  Room,
} from "@/lib/types";
import { KelasClient } from "./kelas-client";

export const metadata = { title: "Kelas" };

export default async function KelasPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [
    classesResult,
    yearsResult,
    gradesResult,
    majorsResult,
    roomsResult,
    teachersResult,
    levelsResult,
    enrollmentsResult,
  ] = await Promise.all([
    supabase
      .from("classes")
      .select("*, academic_years!classes_academic_year_tenant_fkey(name), grades!classes_grade_tenant_fkey(name), majors!classes_major_tenant_fkey(name), rooms!classes_room_tenant_fkey(name), pegawai!classes_teacher_tenant_fkey(full_name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase.from("academic_years").select("id, name, start_date, is_active").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase.from("grades").select("id, name, education_level_id").eq("school_id", schoolId).order("sort_order"),
    supabase.from("majors").select("id, name, education_level_id").eq("school_id", schoolId).order("name"),
    supabase.from("rooms").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("pegawai").select("id, full_name").eq("school_id", schoolId).order("full_name"),
    supabase.from("education_levels").select("id, code, name").eq("school_id", schoolId).order("code"),
    supabase
      .from("student_enrollments")
      .select("class_id")
      .eq("school_id", schoolId)
      .eq("status", "active"),
  ]);

  if (
    classesResult.error || yearsResult.error || gradesResult.error ||
    majorsResult.error || roomsResult.error || teachersResult.error ||
    levelsResult.error || enrollmentsResult.error
  ) {
    return <DataError message="Gagal memuat data kelas." />;
  }

  // Non-fatal: default to false if the query fails (migration 0042 belum diterapkan, dll).
  const schoolResult = await supabase
    .from("schools")
    .select("has_double_sessions")
    .eq("id", schoolId)
    .maybeSingle();

  const doubleSessions = Boolean(schoolResult.data?.has_double_sessions);

  const studentCounts: Record<string, number> = {};
  for (const row of enrollmentsResult.data ?? []) {
    if (!row.class_id) continue;
    studentCounts[row.class_id] = (studentCounts[row.class_id] ?? 0) + 1;
  }

  return (
    <KelasClient
      classes={(classesResult.data ?? []) as SchoolClass[]}
      options={{
        academic_years: yearsResult.data ?? [],
        grades: (gradesResult.data ?? []) as Grade[],
        majors: (majorsResult.data ?? []) as Major[],
        rooms: (roomsResult.data ?? []) as Room[],
        pegawai: teachersResult.data ?? [],
        education_levels: (levelsResult.data ?? []) as EducationLevel[],
      }}
      studentCounts={studentCounts}
      doubleSessions={doubleSessions}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
