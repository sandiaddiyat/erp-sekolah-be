"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
  saveBulkEnrollmentRecord,
  saveBulkEnrollmentDiffRecord,
  fetchAvailableStudentsForAcademicYear,
  fetchClassRoster,
  fetchClassRosterWithAvailable,
  savePlacementRecord,
  fetchUnplacedStudents,
  generateDraftPlacement,
  finalizePlacementRecord,
} from "@/features/akademik/service";
import {
  readSaveAcademicYearInput,
  readSaveEducationLevelInput,
  readSaveGradeInput,
  readSaveRoomInput,
  readSaveMajorInput,
  readSaveClassInput,
  readSaveEnrollmentInput,
  readBulkEnrollmentInput,
  readSavePlacementInput,
  readGenerateDraftPlacementInput,
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

export async function deleteBulkEnrollment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const idsStr = String(formData.get("ids") ?? "").trim();
  if (!idsStr) return { error: "ID pendaftaran tidak ditemukan." };

  let ids: string[] = [];
  try {
    ids = JSON.parse(idsStr);
  } catch {
    return { error: "Format ID tidak valid." };
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "ID pendaftaran tidak valid." };
  }

  const supabase = await createClient();
  // We need to import deleteBulkEnrollmentRecord from service
  const { deleteBulkEnrollmentRecord } = await import("@/features/akademik/service");
  const result = await deleteBulkEnrollmentRecord({ supabase }, guard.user, ids);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  
  const className = String(formData.get("className") ?? "").trim();
  if (className) {
    return { success: `Data pendaftaran ${ids.length} siswa di kelas ${className} berhasil dihapus.` };
  }

  return { success: result.message };
}

// ===== Bulk Student Enrollments =====

export async function fetchAvailableStudents(academicYearId: string) {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { ok: false as const, error: guard.error };
  if (!z.uuid().safeParse(academicYearId).success) {
    return { ok: false as const, error: "Tahun ajaran tidak valid." };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) return { ok: false as const, error: "Sekolah tidak ditemukan." };
  const supabase = await createClient();
  return fetchAvailableStudentsForAcademicYear({ supabase }, schoolId, academicYearId);
}

export async function saveBulkEnrollment(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readBulkEnrollmentInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveBulkEnrollmentRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function saveBulkEnrollmentEdit(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readBulkEnrollmentInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await saveBulkEnrollmentDiffRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function fetchClassMembers(academicYearId: string, classId: string) {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { ok: false as const, error: guard.error };
  if (!z.uuid().safeParse(academicYearId).success || !z.uuid().safeParse(classId).success) {
    return { ok: false as const, error: "Data kelas tidak valid." };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) return { ok: false as const, error: "Sekolah tidak ditemukan." };
  const supabase = await createClient();
  return fetchClassRoster({ supabase }, schoolId, academicYearId, classId);
}

export async function fetchEditModalStudents(academicYearId: string, classId: string) {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { ok: false as const, error: guard.error };
  if (!z.uuid().safeParse(academicYearId).success || !z.uuid().safeParse(classId).success) {
    return { ok: false as const, error: "Data kelas tidak valid." };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) return { ok: false as const, error: "Sekolah tidak ditemukan." };
  const supabase = await createClient();
  return fetchClassRosterWithAvailable({ supabase }, schoolId, academicYearId, classId);
}

// ===== Class Placement (Issue #104) =====

export async function savePlacement(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readSavePlacementInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await savePlacementRecord({ supabase }, guard.user, command.command);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}

export async function fetchUnplaced(academicYearId: string) {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { ok: false as const, error: guard.error };
  if (!z.uuid().safeParse(academicYearId).success) {
    return { ok: false as const, error: "Tahun ajaran tidak valid." };
  }

  const schoolId = guard.user.profile.school_id;
  if (!schoolId) return { ok: false as const, error: "Sekolah tidak ditemukan." };
  const supabase = await createClient();
  return fetchUnplacedStudents({ supabase }, schoolId, academicYearId);
}

export async function generateDraft(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const command = readGenerateDraftPlacementInput(formData);
  if (!command.ok) return { error: command.error };

  const supabase = await createClient();
  const result = await generateDraftPlacement(
    { supabase },
    guard.user,
    command.command.academic_year_id,
    command.command.grade_id
  );
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return {
    success:
      result.unplaced > 0
        ? `${result.created} siswa ditempatkan sebagai draft, ${result.unplaced} siswa belum mendapat kelas.`
        : `${result.created} siswa ditempatkan sebagai draft.`,
  };
}

export async function finalizePlacement(_prevState: FormState, formData: FormData): Promise<FormState> {
  const guard = await requireAkademikManage();
  if ("error" in guard) return { error: guard.error };

  const academicYearId = String(formData.get("academic_year_id") ?? "").trim();
  if (!z.uuid().safeParse(academicYearId).success) {
    return { error: "Tahun ajaran tidak valid." };
  }

  const supabase = await createClient();
  const result = await finalizePlacementRecord({ supabase }, guard.user, academicYearId);
  if (!result.ok) return { error: result.error };

  revalidateAkademik();
  return { success: result.message };
}
