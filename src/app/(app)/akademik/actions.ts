"use server";

import { revalidatePath } from "next/cache";
import { guardAction } from "@/lib/action-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import {
  deleteAcademicYearRecord,
  saveAcademicYearRecord,
  saveEducationLevelRecord,
  deleteEducationLevelRecord,
  saveGradeRecord,
  deleteGradeRecord,
  saveRoomRecord,
  deleteRoomRecord,
  saveMajorRecord,
  deleteMajorRecord,
  saveClassRecord,
  deleteClassRecord,
  saveEnrollmentRecord,
  deleteEnrollmentRecord,
} from "@/features/akademik/service";
import {
  readSaveAcademicYearInput,
  readSaveEducationLevelInput,
  readSaveGradeInput,
  readSaveRoomInput,
  readSaveMajorInput,
  readSaveClassInput,
  readSaveEnrollmentInput,
} from "@/features/akademik/schema";
import type { FormState } from "@/lib/types";

export type { FormState };

function revalidateAkademik() {
  revalidatePath("/akademik");
  revalidatePath("/akademik/tahun-ajaran");
  revalidatePath("/akademik/jenjang");
  revalidatePath("/akademik/tingkat");
  revalidatePath("/akademik/ruangan");
  revalidatePath("/akademik/jurusan");
  revalidatePath("/akademik/kelas");
  revalidatePath("/akademik/pendaftaran");
  revalidatePath("/keuangan/skema-biaya");
  revalidatePath("/keuangan/tagihan-otomatis");
  revalidatePath("/keuangan/diskon");
}

function requireAkademikManage() {
  return guardAction({
    permission: PERMISSIONS.academicsManage,
    deniedMessage: "Anda tidak punya izin mengelola data akademik.",
  });
}

// ===== Academic Years =====
export async function saveAcademicYear(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveAcademicYearInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveAcademicYearRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteAcademicYear(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID tahun ajaran tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteAcademicYearRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

// ===== Education Levels =====
export async function saveEducationLevel(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveEducationLevelInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveEducationLevelRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteEducationLevel(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID jenjang tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteEducationLevelRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

// ===== Grades =====
export async function saveGrade(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveGradeInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveGradeRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteGrade(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID tingkat tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteGradeRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

// ===== Rooms =====
export async function saveRoom(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveRoomInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveRoomRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteRoom(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID ruangan tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteRoomRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

// ===== Majors =====
export async function saveMajor(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveMajorInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveMajorRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteMajor(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID jurusan tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteMajorRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

// ===== Classes =====
export async function saveClass(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveClassInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveClassRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteClass(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID kelas tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteClassRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

// ===== Student Enrollments =====
export async function saveEnrollment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSaveEnrollmentInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveEnrollmentRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function deleteEnrollment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "ID pendaftaran tidak ditemukan." };

  const supabase = await createClient();
  const result = await deleteEnrollmentRecord({ supabase }, guard.user, id);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}
