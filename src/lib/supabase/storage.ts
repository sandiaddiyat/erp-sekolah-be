import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Upload foto siswa ke bucket `student-photos` dan kembalikan URL publiknya.
 * Path: `{schoolId}/{uuid}.{ext}` — folder pertama = school_id, sesuai policy
 * storage yang mengecek `(storage.foldername(name))[1] = current_school_id()`.
 * Mengembalikan `null` bila file kosong; melempar Error berisi pesan ramah
 * bila file tidak valid atau upload gagal.
 */
export async function uploadStudentPhoto(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  file: File
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("File foto harus berupa gambar (JPG, PNG, WebP, atau GIF).");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Ukuran foto maksimal 2 MB.");
  }

  const ext = MIME_EXT[file.type] ?? "bin";
  const path = `${schoolId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("student-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error("Gagal mengunggah foto siswa.");
  }

  const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
  return data.publicUrl ?? null;
}

/**
 * Upload foto pegawai ke bucket `pegawai-photos` dan kembalikan URL publiknya.
 * Path: `{school_id}/{uuid}.{ext}` — folder pertama = school_id, sesuai policy
 * storage yang mengecek `(storage.foldername(name))[1] = current_school_id()`.
 * Membaca bucket publik; melempar Error bila file tidak valid atau upload gagal.
 */
export async function uploadPegawaiPhoto(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  file: File
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (!file.type.startsWith("image/")) {
    throw new Error("File foto harus berupa gambar (JPG, PNG, WebP, atau GIF).");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Ukuran foto maksimal 2 MB.");
  }

  const ext = MIME_EXT[file.type] ?? "bin";
  const path = `${schoolId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("pegawai-photos")
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) {
    throw new Error(`Gagal mengunggah foto pegawai: ${error.message}`);
  }

  const { data } = supabase.storage.from("pegawai-photos").getPublicUrl(path);
  return data.publicUrl ?? null;
}
