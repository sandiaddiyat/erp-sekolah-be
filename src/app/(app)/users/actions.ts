"use server";

import { revalidatePath } from "next/cache";
import { readSaveUserInput } from "@/features/users/schema";
import {
  deleteUserAccount,
  saveUserRecord,
  setUserActiveState,
} from "@/features/users/service";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateUserPages() {
  revalidatePath("/users");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutannya selalu
 *   guard -> parse & validasi input -> authorize -> service -> revalidate.
 * Semua aturan main ada di service layer; file ini hanya menjembatani
 * FormData dengan service.
 */
export async function saveUser(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };

  const input = readSaveUserInput(formData);
  if (!input.ok) return { error: input.error };

  const command = input.command;
  const isEdit = Boolean(command.id);

  const authorize = await guardAction({
    permission: isEdit ? PERMISSIONS.usersUpdate : PERMISSIONS.usersCreate,
    deniedMessage: isEdit
      ? "Anda tidak punya izin mengubah user."
      : "Anda tidak punya izin menambah user.",
  });
  if ("error" in authorize) return { error: authorize.error };

  const supabase = await createClient();
  const result = await saveUserRecord(
    { supabase, createAdmin: createAdminClient },
    authorize.user,
    command
  );

  if (!result.ok) return { error: result.error };

  revalidateUserPages();
  return { success: result.message };
}

export async function setUserActive(
  userId: string,
  isActive: boolean
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.usersUpdate,
    deniedMessage: "Anda tidak punya izin mengubah user.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await setUserActiveState(
    { supabase },
    guard.user,
    userId,
    isActive
  );

  if (!result.ok) return { error: result.error };

  revalidateUserPages();
  return { success: result.message };
}

export async function deleteUser(userId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.usersDelete,
    deniedMessage: "Anda tidak punya izin menghapus user.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deleteUserAccount(
    { supabase, createAdmin: createAdminClient },
    guard.user,
    userId
  );

  if (!result.ok) return { error: result.error };

  revalidateUserPages();
  return { success: result.message };
}
