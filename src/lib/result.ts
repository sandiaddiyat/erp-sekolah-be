/**
 * Hasil standar operasi tulis (mutasi) di service layer.
 * Service TIDAK boleh tahu soal FormData/revalidatePath/toast — dia hanya
 * melaporkan sukses (dengan pesan) atau gagal (dengan pesan error).
 */
export type MutationResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function okResult(message: string): MutationResult {
  return { ok: true, message };
}

export function errResult(error: string): MutationResult {
  return { ok: false, error };
}
