import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Grade, EducationLevel } from "@/lib/types";
import { TingkatClient } from "./tingkat-client";

export const metadata = { title: "Tingkat" };

export default async function TingkatPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [gradesResult, levelsResult] = await Promise.all([
    supabase
      .from("grades")
      .select("*, education_levels!grades_education_level_tenant_fkey!inner(name, code)")
      .eq("school_id", schoolId)
      .order("sort_order"),
    supabase
      .from("education_levels")
      .select("*")
      .eq("school_id", schoolId)
      .order("code"),
  ]);

  if (gradesResult.error || levelsResult.error) {
    return <DataError message="Gagal memuat data tingkat." />;
  }

  const grades = (gradesResult.data ?? []) as Grade[];
  const levels = (levelsResult.data ?? []) as EducationLevel[];

  return (
    <TingkatClient
      grades={grades}
      educationLevels={levels}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
