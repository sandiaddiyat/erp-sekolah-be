import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type { SaveSiswaInput } from "./schema";

/**
 * Service layer fitur siswa: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dependency (client Supabase)
 * di-inject lewat parameter sehingga bisa di-mock saat testing.
 */
export type SiswaMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

type SiswaPayload = Database["public"]["Tables"]["students"]["Insert"];

function buildPayload(command: SaveSiswaInput, schoolId: string): SiswaPayload {
  return {
    school_id: schoolId,
    nis: command.nis || null,
    nisn: command.nisn || null,
    nama_lengkap: command.nama_lengkap,
    nama_panggilan: command.nama_panggilan || null,
    jenis_kelamin: command.jenis_kelamin || null,
    tempat_lahir: command.tempat_lahir || null,
    tanggal_lahir: command.tanggal_lahir || null,
    agama_id: command.agama_id || null,
    status_dalam_keluarga: command.status_dalam_keluarga || null,
    anak_ke: command.anak_ke ?? null,
    alamat: command.alamat || null,
    alamat_dusun: command.alamat_dusun || null,
    alamat_rt: command.alamat_rt || null,
    alamat_rw: command.alamat_rw || null,
    alamat_desa: command.alamat_desa || null,
    alamat_kecamatan: command.alamat_kecamatan || null,
    alamat_kabupaten_kota: command.alamat_kabupaten_kota || null,
    nama_ayah: command.nama_ayah || null,
    pekerjaan_ayah: command.pekerjaan_ayah || null,
    nama_ibu: command.nama_ibu || null,
    pekerjaan_ibu: command.pekerjaan_ibu || null,
    no_telp_rumah: command.no_telp_rumah || null,
    alamat_ortu_dusun: command.alamat_ortu_dusun || null,
    alamat_ortu_rt: command.alamat_ortu_rt || null,
    alamat_ortu_rw: command.alamat_ortu_rw || null,
    alamat_ortu_desa: command.alamat_ortu_desa || null,
    alamat_ortu_kecamatan: command.alamat_ortu_kecamatan || null,
    alamat_ortu_kabupaten_kota: command.alamat_ortu_kabupaten_kota || null,
    nama_wali: command.nama_wali || null,
    pekerjaan_wali: command.pekerjaan_wali || null,
    no_telp_wali: command.no_telp_wali || null,
    alamat_wali_dusun: command.alamat_wali_dusun || null,
    alamat_wali_rt: command.alamat_wali_rt || null,
    alamat_wali_rw: command.alamat_wali_rw || null,
    alamat_wali_desa: command.alamat_wali_desa || null,
    photo_url: command.photo_url || null,
    status: command.status,
  };
}

/** Pesan ramah untuk pelanggaran unique (NIS/NISN duplikat dalam satu sekolah). */
function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    if (/students_school_id_nisn_key/i.test(message)) {
      return "NISN sudah dipakai siswa lain di sekolah ini.";
    }
    if (/students_school_id_nis_key/i.test(message)) {
      return "NIS sudah dipakai siswa lain di sekolah ini.";
    }
    return "Nomor induk sudah dipakai siswa lain di sekolah ini.";
  }
  return null;
}

/**
 * Simpan siswa (buat bila command tanpa `id`, ubah bila ada).
 * `school_id` SELALU dari user yang login — bukan dari input form.
 */
export async function saveSiswaRecord(
  deps: SiswaMutationsDeps,
  current: CurrentUser,
  command: SaveSiswaInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult(
      "Hanya admin sekolah yang boleh mengelola data siswa."
    );
  }

  const { supabase } = deps;
  const payload = buildPayload(command, schoolId);

  if (command.id) {
    const { error } = await supabase
      .from("students")
      .update(payload)
      .eq("id", command.id)
      .eq("school_id", schoolId);

    if (error) {
      return errResult(
        serverError(error, duplicateMessage(error) ?? "Gagal memperbarui siswa.")
      );
    }
    return okResult(`Data ${command.nama_lengkap} berhasil diperbarui.`);
  }

  const { error } = await supabase.from("students").insert(payload);

  if (error) {
    return errResult(
      serverError(error, duplicateMessage(error) ?? "Gagal menambahkan siswa.")
    );
  }

  return okResult(`Siswa ${command.nama_lengkap} berhasil ditambahkan.`);
}

/** Hapus siswa milik sekolah yang sedang login. */
export async function deleteSiswaRecord(
  deps: SiswaMutationsDeps,
  current: CurrentUser,
  siswaId: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola data siswa.");
  }

  const { error } = await deps.supabase
    .from("students")
    .delete()
    .eq("id", siswaId)
    .eq("school_id", schoolId);

  if (error) {
    return errResult(serverError(error, "Gagal menghapus siswa."));
  }

  return okResult("Siswa berhasil dihapus.");
}
