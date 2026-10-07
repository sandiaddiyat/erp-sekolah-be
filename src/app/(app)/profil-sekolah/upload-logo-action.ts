"use server";

import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { uploadSchoolLogo } from "@/lib/supabase/storage";

export async function uploadSchoolLogoAction(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const guard = await guardAction({
    permission: PERMISSIONS.schoolsUpdate,
    deniedMessage: "Anda tidak punya izin mengubah profil sekolah.",
  });
  if ("error" in guard) return { error: guard.error };

  const schoolId = formData.get("school_id")?.toString() ?? "";
  if (!schoolId || (!guard.user.isSuperAdmin && guard.user.profile.school_id !== schoolId)) {
    return { error: "Anda hanya dapat mengunggah logo sekolah Anda sendiri." };
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Tidak ada logo yang dipilih." };
  }

  try {
    const supabase = await createClient();
    const url = await uploadSchoolLogo(supabase, schoolId, file);
    return url ? { url } : { error: "Gagal mengunggah logo sekolah." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Gagal mengunggah logo sekolah.",
    };
  }
}
