import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Room } from "@/lib/types";
import { RuanganClient } from "./ruangan-client";

export const metadata = { title: "Ruangan" };

export default async function RuanganPage() {
  const current = await requirePermission(PERMISSIONS.academicsView);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("school_id", current.profile.school_id ?? "")
    .order("name");

  if (error) {
    return <DataError message="Gagal memuat data ruangan." />;
  }

  const rooms = (data ?? []) as Room[];

  return (
    <RuanganClient
      rooms={rooms}
      canManage={can(current.permissions, PERMISSIONS.academicsManage, current.isSuperAdmin)}
    />
  );
}
