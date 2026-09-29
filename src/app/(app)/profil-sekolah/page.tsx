import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { NoSchool } from "./profil-sekolah-client";
import { SchoolProfilePageForm } from "../sekolah/_components/school-profile-form";
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

  return (
    <div className="mx-auto max-w-[1190px] w-full space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4c9a77]">
          Profil Sekolah
        </p>
        <h1 className="font-heading text-2xl font-bold text-[#183d32]">
          {user.isSuperAdmin ? "Kelola Profil Sekolah" : "Profil Sekolah"}
        </h1>
        <p className="mt-1 text-sm text-[#82978d]">
          {user.isSuperAdmin
            ? `Mengelola data profil ${school.name}.`
            : "Perbarui data identitas dan kontak sekolah Anda."}
        </p>
      </div>

      <div className="rounded-[17px] border border-[#dbe8df] bg-[#fbfdfb] shadow-[0_3px_7px_#1c443305] ring-1 ring-[#dbe8df]">
        <SchoolProfilePageForm school={school} />
      </div>
    </div>
  );
}
