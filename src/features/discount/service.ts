import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type { SaveDiscountTypeInput, SaveStudentDiscountInput } from "./schema";

export type DiscountMutationsDeps = { supabase: SupabaseClient<Database> };

function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Kode diskon ini sudah ada.";
  }
  return null;
}

function handleError(error: unknown, fallback: string) {
  return errResult(serverError(error, duplicateMessage(error) ?? fallback));
}

function ensureSchoolId(user: CurrentUser): string | null {
  return user.profile.school_id ?? null;
}

// ===== Discount Types =====

export async function saveDiscountTypeRecord(
  deps: DiscountMutationsDeps,
  current: CurrentUser,
  payload: SaveDiscountTypeInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola diskon.");

  const { supabase } = deps;
  const { id, code, name, calc_type, is_system } = payload;

  if (id) {
    const { error } = await supabase
      .from("discount_types")
      .update({ code, name, calc_type, is_system })
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleError(error, "Gagal memperbarui jenis diskon.");
    return okResult("Jenis diskon berhasil diperbarui.");
  }

  const { error } = await supabase.from("discount_types").insert({
    school_id: schoolId, code, name, calc_type, is_system,
  });
  if (error) return handleError(error, "Gagal menambahkan jenis diskon.");
  return okResult("Jenis diskon berhasil ditambahkan.");
}

export async function deleteDiscountTypeRecord(
  deps: DiscountMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola diskon.");

  const { error } = await deps.supabase
    .from("discount_types")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleError(error, "Gagal menghapus jenis diskon.");
  return okResult("Jenis diskon berhasil dihapus.");
}

// ===== Student Discounts =====

export async function saveStudentDiscountRecord(
  deps: DiscountMutationsDeps,
  current: CurrentUser,
  payload: SaveStudentDiscountInput
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola diskon.");

  const { supabase } = deps;
  const { id, student_id, discount_type_id, value, start_date, end_date, status } = payload;

  const values = {
    school_id: schoolId, student_id, discount_type_id, value, start_date, end_date, status,
  };

  if (id) {
    const { error } = await supabase
      .from("student_discounts")
      .update(values)
      .eq("id", id)
      .eq("school_id", schoolId);
    if (error) return handleError(error, "Gagal memperbarui diskon.");
    return okResult("Diskon siswa berhasil diperbarui.");
  }

  const { error } = await supabase.from("student_discounts").insert(values);
  if (error) return handleError(error, "Gagal menambahkan diskon siswa.");
  return okResult("Diskon siswa berhasil ditambahkan.");
}

export async function deleteStudentDiscountRecord(
  deps: DiscountMutationsDeps,
  current: CurrentUser,
  id: string
): Promise<MutationResult> {
  const schoolId = ensureSchoolId(current);
  if (!schoolId) return errResult("Hanya admin sekolah yang dapat mengelola diskon.");

  const { error } = await deps.supabase
    .from("student_discounts")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);
  if (error) return handleError(error, "Gagal menghapus diskon.");
  return okResult("Diskon berhasil dihapus.");
}
