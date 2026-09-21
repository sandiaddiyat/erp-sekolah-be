import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { EducationLevel, Major } from "@/lib/types";
import { JurusanClient } from "./jurusan-client";

export const metadata = { title: "Jurusan" };

export default async function JurusanPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [majorsResult, levelsResult] = await Promise.all([
    supabase
      .from("majors")
      .select("*")
      .eq("school_id", schoolId)
      .order("name"),
    supabase.from("education_levels").select("*").eq("school_id", schoolId).order("code"),
  ]);

  if (majorsResult.error || levelsResult.error) {
    return <DataError message="Gagal memuat data jurusan." />;
  }

  const majors = (majorsResult.data ?? []) as Major[];
  const levels = (levelsResult.data ?? []) as EducationLevel[];

  return (
    <JurusanClient
      majors={majors}
      levels={levels}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
