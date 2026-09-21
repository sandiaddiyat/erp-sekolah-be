import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { FeeCategory, FeeStructure, AcademicYear, Grade, EducationLevel, Major } from "@/lib/types";
import { SkemaBiayaClient } from "./skema-biaya-client";

export const metadata = { title: "Skema Biaya" };

export default async function SkemaBiayaPage() {
  const current = await requirePermission(PERMISSIONS.feeStructureView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [categoriesResult, structuresResult, yearsResult, gradesResult, levelsResult, majorsResult] = await Promise.all([
    supabase.from("fee_categories").select("*").eq("school_id", schoolId).order("name"),
    supabase
      .from("fee_structures")
      .select("*, fee_categories(name), academic_years(name), education_levels(name), grades(name), majors(name)")
      .eq("school_id", schoolId)
      .order("amount", { ascending: false }),
    supabase.from("academic_years").select("id, name").eq("school_id", schoolId).order("start_date", { ascending: false }),
    supabase.from("grades").select("id, name, education_level_id").eq("school_id", schoolId).order("sort_order"),
    supabase.from("education_levels").select("id, code, name").eq("school_id", schoolId).order("code"),
    supabase.from("majors").select("id, name, education_level_id").eq("school_id", schoolId).order("name"),
  ]);

  if (categoriesResult.error || structuresResult.error || yearsResult.error || gradesResult.error || levelsResult.error || majorsResult.error) {
    return <DataError message="Gagal memuat data skema biaya." />;
  }

  return (
    <SkemaBiayaClient
      feeCategories={(categoriesResult.data ?? []) as FeeCategory[]}
      feeStructures={(structuresResult.data ?? []) as FeeStructure[]}
      academicYears={(yearsResult.data ?? []) as AcademicYear[]}
      grades={(gradesResult.data ?? []) as Grade[]}
      educationLevels={(levelsResult.data ?? []) as EducationLevel[]}
      majors={(majorsResult.data ?? []) as Major[]}
      canManage={can(current.permissions, PERMISSIONS.feeStructureManage, current.isSuperAdmin)}
    />
  );
}
