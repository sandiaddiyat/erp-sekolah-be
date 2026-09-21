import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type { SaveFeeCategoryInput, SaveFeeStructureInput } from "./schema";

/**
 * Service layer fitur skema biaya: ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dependency (client Supabase) di-inject.
 */
export type FeeStructureMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Kombinasi kategori biaya, tahun ajaran, jenjang, tingkat, dan jurusan yang sama sudah ada.";
  }
  return null;
}

function constraintMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const msg = (error as { message?: string } | null)?.message ?? "";
  if (code === "23503" || /foreign key/i.test(msg)) {
    return "Referensi yang dipilih tidak valid (tahun ajaran, jenjang, tingkat, atau jurusan tidak ditemukan).";
  }
  return null;
}

const handleError = (error: unknown, fallback: string) =>
  errResult(serverError(error, duplicateMessage(error) ?? constraintMessage(error) ?? fallback));

function ensureSchoolId(user: CurrentUser): string | null {
  if (!user.profile.school_id) {
    return null;
  }
  return user.profile.school_id;
}

// ===== Fee Categories =====

export async function saveFeeCategoryRecord(
  deps: FeeStructureMutationsDeps,
  current: CurrentUser,
  payload: SaveFeeCategoryInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola skema biaya.");
  }

  const { supabase } = deps;
  const { id, name, billing_cycle, description } = payload;

  if (id) {
    const { error } = await supabase
      .from("fee_categories")
      .update({ name, billing_cycle, description })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleError(error, "Gagal memperbarui kategori biaya.");
    return okResult("Kategori biaya berhasil diperbarui.");
  }

  const { error } = await supabase.from("fee_categories").insert({
    school_id: schoolId,
    name,
    billing_cycle,
    description,
  });
  if (error) return handleError(error, "Gagal menambahkan kategori biaya.");
  return okResult("Kategori biaya berhasil ditambahkan.");
}

export async function deleteFeeCategoryRecord(
  deps: FeeStructureMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola skema biaya.");
  }

  const { error } = await deps.supabase
    .from("fee_categories")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleError(error, "Gagal menghapus kategori biaya.");
  return okResult("Kategori biaya berhasil dihapus.");
}

// ===== Fee Structures =====

export async function saveFeeStructureRecord(
  deps: FeeStructureMutationsDeps,
  current: CurrentUser,
  payload: SaveFeeStructureInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola skema biaya.");
  }

  const { supabase } = deps;
  const { id, academic_year_id, education_level_id, grade_id, major_id, fee_category_id, amount, due_day } = payload;

  if (id) {
    const { error } = await supabase
      .from("fee_structures")
      .update({ academic_year_id, education_level_id, grade_id, major_id, fee_category_id, amount, due_day })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleError(error, "Gagal memperbarui skema biaya.");
    return okResult("Skema biaya berhasil diperbarui.");
  }

  const { error } = await supabase.from("fee_structures").insert({
    school_id: schoolId,
    academic_year_id,
    education_level_id,
    grade_id,
    major_id,
    fee_category_id,
    amount,
    due_day,
  });
  if (error) return handleError(error, "Gagal menambahkan skema biaya.");
  return okResult("Skema biaya berhasil ditambahkan.");
}

export async function deleteFeeStructureRecord(
  deps: FeeStructureMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) {
    return errResult("Hanya admin sekolah yang dapat mengelola skema biaya.");
  }

  const { error } = await deps.supabase
    .from("fee_structures")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleError(error, "Gagal menghapus skema biaya.");
  return okResult("Skema biaya berhasil dihapus.");
}
