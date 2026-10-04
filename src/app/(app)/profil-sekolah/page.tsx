import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { NoSchool, SchoolProfilePageView } from "./profil-sekolah-client";
import type { School } from "@/lib/types";

export const metadata = { title: "Profil Sekolah" };

export default async function ProfilSekolahPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Tanpa izin ini, admin sekolah tidak boleh mengubah data sekolahnya.
  if (!can(user.permissions, PERMISSIONS.schoolsUpdate, user.isSuperAdmin)) {
    redirect("/tidak-berhak");
  }

  // Super admin belum tentu punya sekolah, jadi sekolah yang diedit dipilih
  // eksplisit lewat query param. Admin sekolah otomatis memakai sekolahnya.
  const params = await searchParams;
  const schoolId = user.isSuperAdmin
    ? params.school
    : user.profile.school_id;

  if (!schoolId) return <NoSchool isSuperAdmin={user.isSuperAdmin} />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .maybeSingle();

  if (error) {
    return (
      <NoSchool isSuperAdmin={user.isSuperAdmin} reason="Gagal memuat data sekolah." />
    );
  }

  if (!data) return <NoSchool isSuperAdmin={user.isSuperAdmin} />;

  const school = data as School;

  return <SchoolProfilePageView school={school} isSuperAdmin={user.isSuperAdmin} />;
}
