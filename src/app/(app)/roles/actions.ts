"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { saveRoleRecord, deleteRoleRecord } from "@/features/roles/service";
import { readSaveRoleInput } from "@/features/roles/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateRolePages() {
  revalidatePath("/roles");
  revalidatePath("/users");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutan selalu
 *   guard -> parse & validasi input -> authorize -> service -> revalidate.
 * Semua aturan main ada di service layer; file ini hanya menjembatani
 * FormData dengan service.
 */
export async function saveRole(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };

  const input = readSaveRoleInput(formData);
  if (!input.ok) return { error: input.error };

  const command = input.command;
  const isEdit = Boolean(command.id);

  const authorize = await guardAction({
    permission: isEdit ? PERMISSIONS.rolesUpdate : PERMISSIONS.rolesCreate,
    deniedMessage: isEdit
      ? "Anda tidak punya izin mengubah role."
      : "Anda tidak punya izin menambah role.",
  });
  if ("error" in authorize) return { error: authorize.error };

  const supabase = await createClient();
  const result = await saveRoleRecord(
    { supabase },
    authorize.user,
    command
  );

  if (!result.ok) return { error: result.error };

  revalidateRolePages();
  return { success: result.message };
}

export async function deleteRole(roleId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.rolesDelete,
    deniedMessage: "Anda tidak punya izin menghapus role.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteRoleRecord({ supabase }, guard.user, roleId);

  if (!result.ok) return { error: result.error };

  revalidateRolePages();
  return { success: result.message };
}
