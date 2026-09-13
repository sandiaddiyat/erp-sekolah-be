import { DataError } from "@/components/data-error";
import { requireSuperAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { School, SchoolWithCounts } from "@/lib/types";
import { SekolahClient } from "./sekolah-client";

export const metadata = { title: "Sekolah" };

export default async function SekolahPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const [schoolsResult, profilesResult, rolesResult, notesResult] = await Promise.all([
    supabase.from("schools").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("school_id"),
    supabase.from("roles").select("school_id"),
    supabase.from("school_notes").select("school_id, note").order("created_at"),
  ]);

  const loadError =
    schoolsResult.error ??
    profilesResult.error ??
    rolesResult.error ??
    notesResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data sekolah." />;
  }

  const userCount = new Map<string, number>();
  for (const row of (profilesResult.data ?? []) as { school_id: string | null }[]) {
    if (!row.school_id) continue;
    userCount.set(row.school_id, (userCount.get(row.school_id) ?? 0) + 1);
  }

  const roleCount = new Map<string, number>();
  for (const row of (rolesResult.data ?? []) as { school_id: string | null }[]) {
    if (!row.school_id) continue;
    roleCount.set(row.school_id, (roleCount.get(row.school_id) ?? 0) + 1);
  }

  const notesBySchool = new Map<string, string[]>();
  for (const row of (notesResult.data ?? []) as { school_id: string; note: string }[]) {
    const list = notesBySchool.get(row.school_id) ?? [];
    list.push(row.note);
    notesBySchool.set(row.school_id, list);
  }

  const schools: SchoolWithCounts[] = ((schoolsResult.data ?? []) as School[]).map(
    (school) => ({
      ...school,
      user_count: userCount.get(school.id) ?? 0,
      role_count: roleCount.get(school.id) ?? 0,
      notes: (notesBySchool.get(school.id) ?? []).join("\n"),
    })
  );

  return <SekolahClient schools={schools} />;
}
