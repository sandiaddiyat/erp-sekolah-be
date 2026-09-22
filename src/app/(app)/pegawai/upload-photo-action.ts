"use server";

import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { uploadPegawaiPhoto } from "@/lib/supabase/storage";

export async function uploadPegawaiPhotoAction(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const authorize = await guardAction({
    permission: PERMISSIONS.pegawaiCreate,
    deniedMessage: "Anda tidak punya izin mengunggah foto pegawai.",
  });
  if ("error" in authorize) return { error: authorize.error };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Tidak ada file yang dipilih." };
  }

  const school_id = formData.get("school_id")?.toString() ?? "";

  try {
    const supabase = await createClient();
    const url = await uploadPegawaiPhoto(supabase, school_id, file);
    if (!url) return { error: "Gagal mengunggah foto." };
    return { url };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Gagal mengunggah foto.",
    };
  }
}
