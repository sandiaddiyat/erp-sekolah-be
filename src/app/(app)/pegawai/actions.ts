"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  deletePegawaiRecord,
  savePegawaiRecord,
} from "@/features/pegawai/service";
import { readSavePegawaiInput } from "@/features/pegawai/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidatePegawaiPages() {
  revalidatePath("/pegawai");
  revalidatePath("/dashboard");
}

/**
 * Adapter tipis: urutan selalu
 *   guard -> parse & validasi input -> service -> revalidate.
 * Semua aturan main ada di service layer; file ini hanya menjembatani
 * FormData dengan service.
 */
export async function savePegawai(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const guard = await guardAction();
  if ("error" in guard) return { error: guard.error };

  const command = readSavePegawaiInput(formData);
  if (!command.ok) return { error: command.error };

  const isEdit = Boolean(command.command.id);
  const authorize = await guardAction({
    permission: isEdit ? PERMISSIONS.pegawaiUpdate : PERMISSIONS.pegawaiCreate,
    deniedMessage: isEdit
      ? "Anda tidak punya izin mengubah pegawai."
      : "Anda tidak punya izin menambah pegawai.",
  });
  if ("error" in authorize) return { error: authorize.error };

  const supabase = await createClient();
  const result = await savePegawaiRecord(
    { supabase },
    authorize.user,
    command.command
  );

  if (!result.ok) return { error: result.error };

  revalidatePegawaiPages();
  return { success: result.message };
}

export async function deletePegawai(pegawaiId: string): Promise<FormState> {
  const guard = await guardAction({
    permission: PERMISSIONS.pegawaiDelete,
    deniedMessage: "Anda tidak punya izin menghapus pegawai.",
  });
  if ("error" in guard) return { error: guard.error };

  const supabase = await createClient();
  const result = await deletePegawaiRecord({ supabase }, guard.user, pegawaiId);

  if (!result.ok) return { error: result.error };

  revalidatePegawaiPages();
  return { success: result.message };
}
