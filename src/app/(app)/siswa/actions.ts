"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { uploadStudentPhoto } from "@/lib/supabase/storage";
import { deleteSiswaRecord, saveSiswaRecord } from "@/features/siswa/service";
import { readSaveSiswaInput } from "@/features/siswa/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateSiswaPages() {
  revalidatePath("/siswa");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutan selalu
 *   guard -> parse & validasi input -> service -> revalidate.
 * Semua aturan main ada di service layer; file ini hanya menjembatujni
 * FormData dengan service.
 */
export async function saveSiswa(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveSiswaInput(formData);
  if (!command.ok) return { error: command.error };

  // Foto baru (file) menimpa photo_url lama dari hidden input.
  const photoFile = formData.get("photo");
  if (photoFile instanceof File && photoFile.size > 0) {
    const supabaseForUpload = await createClient();
    try {
      const photoUrl = await uploadStudentPhoto(
        supabaseForUpload,
        guard.user.profile.school_id ?? "",
        photoFile
      );
      if (photoUrl) command.command.photo_url = photoUrl;
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Gagal mengunggah foto." };
    }
  }

  const isEdit = Boolean(command.command.id);
  const authorize = await guardAction({
    permission: isEdit ? PERMISSIONS.studentsUpdate : PERMISSIONS.studentsCreate,
    deniedMessage: isEdit
      ? "Anda tidak punya izin mengubah siswa."
      : "Anda tidak punya izin menambah siswa.",
  });
  if ("error" in authorize) return { error: authorize.error };

  const supabase = await createClient();
  const result = await saveSiswaRecord(
    { supabase },
    authorize.user,
    command.command
  );

  if (!result.ok) return { error: result.error };

  revalidateSiswaPages();
  return { success: result.message };
}

export async function deleteSiswa(siswaId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.studentsDelete,
    deniedMessage: "Anda tidak punya izin menghapus siswa.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteSiswaRecord({ supabase }, guard.user, siswaId);

  if (!result.ok) return { error: result.error };

  revalidateSiswaPages();
  return { success: result.message };
}
