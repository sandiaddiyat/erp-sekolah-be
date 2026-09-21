import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Class as SchoolClass, AcademicYear, Grade, Major, Room } from "@/lib/types";
import { KelasClient } from "./kelas-client";

export const metadata = { title: "Kelas" };

type PegawaiSimple = { id: string; full_name: string };

export default async function KelasPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [classesResult, yearsResult, gradesResult, majorsResult, roomsResult, teachersResult] = await Promise.all([
    supabase
      .from("classes")
      .select("*, academic_years(name), grades(name), majors(name), rooms(name), pegawai(full_name)")
      .eq("school_id", schoolId)
      .order("name"),
    supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase.from("grades").select("id, name, education_level_id").eq("school_id", schoolId).order("sort_order"),
    supabase.from("majors").select("id, name, education_level_id").eq("school_id", schoolId).order("name"),
    supabase.from("rooms").select("id, name").eq("school_id", schoolId).order("name"),
    supabase.from("pegawai").select("id, full_name").eq("school_id", schoolId).order("full_name"),
  ]);

  if (
    classesResult.error || yearsResult.error || gradesResult.error ||
    majorsResult.error || roomsResult.error || teachersResult.error
  ) {
    return <DataError message="Gagal memuat data kelas." />;
  }

  return (
    <KelasClient
      classes={(classesResult.data ?? []) as SchoolClass[]}
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      grades={(gradesResult.data ?? []) as Grade[]}
      majors={(majorsResult.data ?? []) as Major[]}
      rooms={(roomsResult.data ?? []) as Room[]}
      teachers={(teachersResult.data ?? []) as PegawaiSimple[]}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
