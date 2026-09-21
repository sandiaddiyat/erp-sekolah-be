import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear } from "@/lib/types";
import { AcademicYearClient } from "./tahun-ajaran-client";

export const metadata = { title: "Tahun Ajaran" };

export default async function TahunAjaranPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();

  const [yearsResult] = await Promise.all([
    supabase
      .from("academic_years")
      .select("*")
      .eq("school_id", current.profile.school_id ?? "")
      .order("created_at", { ascending: false }),
  ]);

  if (yearsResult.error) {
    return <DataError message="Gagal memuat data tahun ajaran." />;
  }

  const academicYears = (yearsResult.data ?? []) as AcademicYear[];

  return (
    <AcademicYearClient
      academicYears={academicYears}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
