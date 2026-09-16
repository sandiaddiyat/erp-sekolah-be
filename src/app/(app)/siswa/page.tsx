import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Siswa } from "@/lib/types";
import { SiswaClient } from "./siswa-client";

export const metadata = { title: "Data Siswa" };

export type SiswaOptionLists = {
  agama: { id: string; nama_agama: string }[];
};

export default async function SiswaPage() {
  const current = await requirePermission(PERMISSIONS.studentsView);
  const supabase = await createClient();

  const [siswaResult, agamaResult] = await Promise.all([
    supabase.from("students").select("*").order("nama_lengkap"),
    supabase.from("agama").select("id, nama_agama").order("nama_agama"),
  ]);

  const loadError = siswaResult.error ?? agamaResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data siswa." />;
  }

  const options: SiswaOptionLists = {
    agama: (agamaResult.data ?? []) as SiswaOptionLists["agama"],
  };

  const siswa = (siswaResult.data ?? []) as Siswa[];

  return (
    <SiswaClient
      siswa={siswa}
      options={options}
      permissions={{
        create: can(current.permissions, PERMISSIONS.studentsCreate, current.isSuperAdmin),
        update: can(current.permissions, PERMISSIONS.studentsUpdate, current.isSuperAdmin),
        delete: can(current.permissions, PERMISSIONS.studentsDelete, current.isSuperAdmin),
      }}
    />
  );
}
