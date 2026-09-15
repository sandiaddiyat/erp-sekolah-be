"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  deleteMasterRecord,
  isMasterEntity,
  saveMasterRecord,
} from "@/features/master/service";
import { readSaveMasterInput } from "@/features/master/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateMasterPages() {
  revalidatePath("/master");
  revalidatePath("/pegawai");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutan selalu
 *   guard -> parse & validasi input -> service -> revalidate.
 * Semua aturan main ada di service layer; file ini hanya menjembatani
 * FormData dengan service.
 */
export async function saveMaster(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.masterManage,
    deniedMessage: "Anda tidak punya izin mengelola data master.",
  });
  if ("error" in guard) return { error: guard.error };

  const entity = String(formData.get("entity") ?? "");
  if (!isMasterEntity(entity)) {
    return { error: "Jenis data master tidak dikenal." };
  }

  const id = String(formData.get("id") ?? "").trim();
  const input = readSaveMasterInput(entity, formData);
  if (!input.ok) return { error: input.error };

  const supabase = await createClient();
  const result = await saveMasterRecord(
    { supabase },
    guard.user,
    entity,
    id || null,
    input.payload
  );

  if (!result.ok) return { error: result.error };

  revalidateMasterPages();
  return { success: result.message };
}

export async function deleteMaster(
  entity: string,
  id: string
): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.masterManage,
    deniedMessage: "Anda tidak punya izin mengelola data master.",
  });
  if ("error" in guard) return { error: guard.error };

  if (!isMasterEntity(entity)) {
    return { error: "Jenis data master tidak dikenal." };
  }

  const supabase = await createClient();
  const result = await deleteMasterRecord({ supabase }, guard.user, entity, id);

  if (!result.ok) return { error: result.error };

  revalidateMasterPages();
  return { success: result.message };
}
