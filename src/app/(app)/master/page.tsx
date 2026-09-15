import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { listMaster, type MasterRow } from "@/features/master/service";
import { MASTER_ENTITIES } from "@/features/master/schema";
import { MasterClient } from "./master-client";

export const metadata = { title: "Master Data" };

export default async function MasterPage() {
  const current = await requirePermission(PERMISSIONS.masterView);
  const supabase = await createClient();

  const results = await Promise.all(
    MASTER_ENTITIES.map((entity) =>
      listMaster(supabase, entity, current.profile.school_id)
    )
  );

  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    return <DataError message={firstError} />;
  }

  const data = Object.fromEntries(
    MASTER_ENTITIES.map((entity, index) => [entity, results[index].rows])
  ) as Record<string, MasterRow[]>;

  return (
    <MasterClient
      data={data}
      canManage={can(current.permissions, PERMISSIONS.masterManage, current.isSuperAdmin)}
    />
  );
}
