import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { can } from "@/lib/rbac";
import { subscriptionProblem } from "@/lib/school";
import type { CurrentUser, Profile, Role, School } from "@/lib/types";

type RoleRef = Pick<Role, "id" | "name" | "slug">;

type UserContext = {
  profile: Profile;
  school: School | null;
  roles: RoleRef[];
  permissions: string[];
};

/**
 * Ambil user yang sedang login beserta profile, sekolah, role, dan permission.
 *
 * Hanya SATU round trip ke database (fungsi get_current_user_context).
 * Dijalankan lewat client yang membawa JWT user, sehingga tanda tangan dan masa
 * berlaku token tetap diverifikasi oleh Supabase sebelum fungsi dieksekusi —
 * jadi tidak perlu panggilan auth.getUser() terpisah.
 *
 * Di-cache per request (React cache), aman dipanggil berkali-kali dari
 * komponen berbeda tanpa query tambahan.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_current_user_context");

  if (error || !data) return null;

  const context = data as UserContext;
  const profile = context.profile;

  if (!profile?.id) return null;

  return {
    id: profile.id,
    email: profile.email,
    profile,
    school: context.school ?? null,
    roles: context.roles ?? [],
    permissions: context.permissions ?? [],
    isSuperAdmin: profile.is_super_admin,
  };
});

/** Untuk halaman: redirect ke /login kalau belum login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Untuk halaman: redirect ke /tidak-berhak kalau tidak punya permission. */
export async function requirePermission(slug: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.permissions, slug, user.isSuperAdmin)) {
    redirect("/tidak-berhak");
  }
  return user;
}

/**
 * Untuk halaman tingkat platform. Tidak memakai permission karena konsol
 * platform memang hanya untuk pemilik aplikasi, bukan untuk role sekolah.
 */
export async function requireSuperAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/tidak-berhak");
  return user;
}

export function userCan(user: CurrentUser | null, slug: string): boolean {
  if (!user) return false;
  return can(user.permissions, slug, user.isSuperAdmin);
}

/**
 * Profil dianggap "siap pakai" kalau aktif dan sudah punya sekolah.
 * Super admin platform boleh belum punya sekolah.
 */
export function isProfileReady(user: CurrentUser): boolean {
  if (user.isSuperAdmin) return true;
  return user.profile.is_active && Boolean(user.profile.school_id);
}

/**
 * Alasan user tidak boleh melakukan aksi (akun nonaktif, sekolah suspend,
 * atau masa aktif berakhir). `null` berarti boleh melanjutkan.
 * Dipakai sebagai guard di setiap Server Action agar penegakan tidak
 * hanya bergantung pada UI.
 */
export function accessBlocked(user: CurrentUser): string | null {
  if (user.isSuperAdmin) return null;
  if (!user.profile.is_active) {
    return "Akun Anda dinonaktifkan. Hubungi administrator sekolah Anda.";
  }
  const problem = subscriptionProblem(user.school);
  if (problem === "suspended") {
    return "Sekolah Anda sedang ditangguhkan, sehingga akses dibatasi.";
  }
  if (problem === "expired") {
    return "Masa aktif sekolah Anda telah berakhir, sehingga akses dibatasi.";
  }
  return null;
}
