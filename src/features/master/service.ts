import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { serverError } from "@/lib/errors";
import { errResult, okResult, type MutationResult } from "@/lib/result";
import type { CurrentUser } from "@/lib/types";
import { MASTER_ENTITIES, type MasterEntity, type MasterPayload } from "./schema";

/**
 * Service layer fitur master data: berisi ATURAN MAINNYA SAJA — tanpa
 * FormData, tanpa revalidatePath, tanpa Next.js. Dependency (client Supabase)
 * di-inject lewat parameter sehingga bisa di-mock saat testing.
 */
export type MasterMutationsDeps = {
  supabase: SupabaseClient<Database>;
};

/**
 * Whitelist nama tabel yang boleh dioperasikan service. Nama tabel TIDAK
 * PERNAH diambil langsung dari input user tanpa lewat daftar ini.
 */
export const MASTER_TABLES: Record<MasterEntity, string> = {
  status_kepegawaian: "status_kepegawaian",
  jabatan: "jabatan",
  golongan: "golongan",
  unit_kerja: "unit_kerja",
  mapel: "mapel",
  jurusan: "jurusan",
  jenis_sertifikasi: "jenis_sertifikasi",
  jenis_cuti_izin: "jenis_cuti_izin",
  tahun_ajaran: "tahun_ajaran",
};

export function isMasterEntity(value: string): value is MasterEntity {
  return (MASTER_ENTITIES as readonly string[]).includes(value);
}

export type MasterRow = Record<string, unknown>;

/**
 * Tipe longgar untuk query builder master. Service mengoperasikan banyak
 * tabel dengan bentuk kolom berbeda melalui satu fungsi generik, sehingga
 * builder diperlakukan longgar — kesesuaian kolom tetap dijamin whitelist
 * MASTER_TABLES dan skema Zod, bukan oleh tipe.
 */
type MasterQueryResult = {
  data: unknown;
  error: { message?: string; code?: string } | null;
};

type MasterOrderable = PromiseLike<MasterQueryResult> & {
  order: (column: string, options?: { ascending?: boolean }) => MasterOrderable;
  eq: (column: string, value: unknown) => MasterOrderable;
};

type MasterFilter = PromiseLike<MasterQueryResult> & {
  eq: (column: string, value: unknown) => MasterFilter;
};

type MasterBuilder = {
  select: (columns: string) => MasterOrderable;
  update: (payload: MasterPayload) => MasterFilter;
  insert: (payload: MasterPayload) => MasterFilter;
  delete: () => MasterFilter;
};

function masterTable(
  client: SupabaseClient<Database>,
  entity: MasterEntity
): MasterBuilder {
  const table = MASTER_TABLES[entity] as keyof Database["public"]["Tables"];
  return client.from(table) as unknown as MasterBuilder;
}

/**
 * Ambil daftar baris master untuk satu entitas milik sekolah yang sedang
 * login. Penyaringan tenant ditegakkan dua lapis: filter eksplisit di sini
 * (RLS select membiarkan super admin melihat semua tenant) dan RLS.
 */
export async function listMaster(
  supabase: SupabaseClient<Database>,
  entity: MasterEntity,
  schoolId: string | null
): Promise<{ rows: MasterRow[]; error: string | null }> {
  let query = masterTable(supabase, entity).select("*").order("created_at");

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  // Kolom nama berbeda-beda; urutkan sekunder berdasarkan kolom nama utama.
  const nameColumn: Record<MasterEntity, string> = {
    status_kepegawaian: "nama_status",
    jabatan: "nama_jabatan",
    golongan: "kode_golongan",
    unit_kerja: "nama_unit",
    mapel: "nama_mapel",
    jurusan: "nama_jurusan",
    jenis_sertifikasi: "nama_sertifikasi",
    jenis_cuti_izin: "nama_jenis",
    tahun_ajaran: "nama_tahun_ajaran",
  };
  query = query.order(nameColumn[entity]);

  const { data, error } = await query;

  if (error) {
    serverError(error, "Gagal memuat data master.");
    return { rows: [], error: "Gagal memuat data master." };
  }

  return { rows: (data ?? []) as MasterRow[], error: null };
}

/**
 * Simpan baris master (buat bila `id` kosong, ubah bila ada).
 * Kolom `school_id` SELALU diambil dari user yang login — bukan dari input.
 */
export async function saveMasterRecord(
  deps: MasterMutationsDeps,
  current: CurrentUser,
  entity: MasterEntity,
  id: string | null,
  payload: MasterPayload
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    // Super admin platform tidak terikat sekolah; master dikelola admin sekolah.
    return errResult(
      "Hanya admin sekolah yang boleh mengelola data master. Super admin dapat mengubah data lewat akun admin sekolah."
    );
  }

  const { supabase } = deps;

  if (id) {
    const { error } = await masterTable(supabase, entity)
      .update(payload)
      .eq("id", id)
      .eq("school_id", schoolId);

    if (error) {
      return errResult(
        serverError(error, duplicateMessage(error) ?? "Gagal memperbarui data.")
      );
    }
    return okResult("Perubahan berhasil disimpan.");
  }

  const { error } = await masterTable(supabase, entity).insert({
    ...payload,
    school_id: schoolId,
  });

  if (error) {
    return errResult(
      serverError(error, duplicateMessage(error) ?? "Gagal menambahkan data.")
    );
  }

  return okResult("Data berhasil ditambahkan.");
}

/**
 * Pesan khusus untuk pelanggaran unique per-tenant, agar admin paham
 * datanya duplikat (bukan error teknis).
 */
function duplicateMessage(error: unknown): string | null {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  if (code === "23505" || /duplicate key/i.test(message)) {
    return "Data dengan nama/kode yang sama sudah ada.";
  }
  return null;
}

/** Hapus baris master milik sekolah yang sedang login. */
export async function deleteMasterRecord(
  deps: MasterMutationsDeps,
  current: CurrentUser,
  entity: MasterEntity,
  id: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola data master.");
  }

  const { error } = await masterTable(deps.supabase, entity)
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "23503" || /foreign key/i.test(error.message ?? "")) {
      return errResult(
        "Data masih dipakai di data lain (mis. data pegawai) sehingga tidak bisa dihapus."
      );
    }
    return errResult(serverError(error, "Gagal menghapus data."));
  }

  return okResult("Data berhasil dihapus.");
}
