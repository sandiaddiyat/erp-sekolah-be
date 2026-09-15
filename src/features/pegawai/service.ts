import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import type { SavePegawaiInput } from "./schema";

/**
 * Service layer fitur pegawai: berisi ATURAN MAINNYA SAJA — tanpa FormData,
 * tanpa revalidatePath, tanpa Next.js. Dependency (client Supabase)
 * di-inject lewat parameter sehingga bisa di-mock saat testing.
 */
export type PegawaiMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

type PegawaiPayload = Database["public"]["Tables"]["pegawai"]["Insert"];

function buildPayload(command: SavePegawaiInput, schoolId: string): PegawaiPayload {
  return {
    school_id: schoolId,
    full_name: command.full_name,
    nip: command.nip || null,
    niy: command.niy || null,
    nuptk: command.nuptk || null,
    jenis_kelamin: command.jenis_kelamin || null,
    tempat_lahir: command.tempat_lahir || null,
    tanggal_lahir: command.tanggal_lahir || null,
    agama_id: command.agama_id || null,
    status_kepegawaian_id: command.status_kepegawaian_id || null,
    jabatan_id: command.jabatan_id || null,
    golongan_id: command.golongan_id || null,
    unit_kerja_id: command.unit_kerja_id || null,
    pendidikan_terakhir_id: command.pendidikan_terakhir_id || null,
    jurusan_id: command.jurusan_id || null,
    jenis_sertifikasi_id: command.jenis_sertifikasi_id || null,
    tahun_masuk: command.tahun_masuk || null,
    alamat: command.alamat || null,
    phone: command.phone || null,
    email: command.email || null,
    bank_id: command.bank_id || null,
    no_rekening: command.no_rekening || null,
    is_active: command.is_active,
  };
}

/** Pesan ramah untuk pelanggaran unique (NIP/NIY duplikat dalam satu sekolah). */
function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    return "NIP sudah dipakai pegawai lain di sekolah ini.";
  }
  return null;
}

/**
 * Simpan pegawai (buat bila command tanpa `id`, ubah bila ada).
 * `school_id` SELALU dari user yang login — bukan dari input form.
 */
export async function savePegawaiRecord(
  deps: PegawaiMutationsDeps,
  current: CurrentUser,
  command: SavePegawaiInput
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult(
      "Hanya admin sekolah yang boleh mengelola data pegawai."
    );
  }

  const { supabase } = deps;
  const payload = buildPayload(command, schoolId);

  if (command.id) {
    const { error } = await supabase
      .from("pegawai")
      .update(payload)
      .eq("id", command.id)
      .eq("school_id", schoolId);

    if (error) {
      return errResult(
        serverError(error, duplicateMessage(error) ?? "Gagal memperbarui pegawai.")
      );
    }
    return okResult(`Data ${command.full_name} berhasil diperbarui.`);
  }

  const { error } = await supabase.from("pegawai").insert(payload);

  if (error) {
    return errResult(
      serverError(error, duplicateMessage(error) ?? "Gagal menambahkan pegawai.")
    );
  }

  return okResult(`Pegawai ${command.full_name} berhasil ditambahkan.`);
}

/** Hapus pegawai milik sekolah yang sedang login. */
export async function deletePegawaiRecord(
  deps: PegawaiMutationsDeps,
  current: CurrentUser,
  pegawaiId: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola data pegawai.");
  }

  const { error } = await deps.supabase
    .from("pegawai")
    .delete()
    .eq("id", pegawaiId)
    .eq("school_id", schoolId);

  if (error) {
    return errResult(serverError(error, "Gagal menghapus pegawai."));
  }

  return okResult("Pegawai berhasil dihapus.");
}
