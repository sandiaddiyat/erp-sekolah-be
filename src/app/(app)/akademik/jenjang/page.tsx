import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { EducationLevel } from "@/lib/types";
import { JenjangClient } from "./jenjang-client";

export const metadata = { title: "Jenjang Pendidikan" };

export default async function JenjangPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("education_levels")
    .select("*")
    .eq("school_id", current.profile.school_id ?? "")
    .order("code");

  if (error) {
    return <DataError message="Gagal memuat data jenjang pendidikan." />;
  }

  const jenjangs = (data ?? []) as EducationLevel[];

  return (
    <JenjangClient
      jenjangs={jenjangs}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
