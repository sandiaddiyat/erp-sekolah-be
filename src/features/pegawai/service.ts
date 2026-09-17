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
    // Kolom lama tetap diisi dari jabatan utama (keputusan desain #19 no.1).
    jabatan_id: command.jabatan_utama_id || null,
    golongan_id: command.golongan_id || null,
    unit_kerja_id: command.unit_kerja_id || null,
    tahun_masuk: command.tahun_masuk || null,
    alamat: command.alamat || null,
    phone: command.phone || null,
    email: command.email || null,
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

type PegawaiJabatanRow = {
  id: string;
  jabatan_id: string;
};

/**
 * Sinkronisasi penuh baris pegawai_jabatan dengan daftar jabatan final.
 * Setiap query pivot menyertakan filter school_id (multi-tenant).
 * Gagal sinkron TIDAK menggagalkan penyimpanan pegawai — caller tetap
 * melaporkan sukses dengan pesan peringatan.
 */
async function syncPegawaiJabatan(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  pegawaiId: string,
  jabatanIds: string[],
  jabatanUtamaId: string | null
): Promise<boolean> {
  const existing = await supabase
    .from("pegawai_jabatan")
    .select("id, jabatan_id")
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId);

  if (existing.error) {
    return false;
  }

  const rows = (existing.data ?? []) as PegawaiJabatanRow[];
  const wanted = new Set(jabatanIds);
  const current = new Set(rows.map((row) => row.jabatan_id));

  // a. Hapus baris yang jabatannya tidak lagi dipilih.
  const staleIds = rows
    .filter((row) => !wanted.has(row.jabatan_id))
    .map((row) => row.id);
  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("pegawai_jabatan")
      .delete()
      .in("id", staleIds)
      .eq("school_id", schoolId);
    if (error) return false;
  }

  // b. Insert jabatan baru yang belum ada.
  const newIds = jabatanIds.filter((id) => !current.has(id));
  if (newIds.length > 0) {
    const { error } = await supabase.from("pegawai_jabatan").insert(
      newIds.map((jabatanId) => ({
        school_id: schoolId,
        pegawai_id: pegawaiId,
        jabatan_id: jabatanId,
        is_utama: jabatanUtamaId === jabatanId,
      }))
    );
    if (error) return false;
  }

  // c. Atur ulang penanda is_utama (sinkron penuh, sederhana & pasti benar).
  const { error: resetError } = await supabase
    .from("pegawai_jabatan")
    .update({ is_utama: false })
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId)
    .eq("is_utama", true);
  if (resetError) return false;

  if (jabatanUtamaId) {
    const { error } = await supabase
      .from("pegawai_jabatan")
      .update({ is_utama: true })
      .eq("pegawai_id", pegawaiId)
      .eq("school_id", schoolId)
      .eq("jabatan_id", jabatanUtamaId);
    if (error) return false;
  }

  return true;
}

/**
 * Jenjang pendidikan diurutkan dari terendah ke tertinggi; urutan ini juga
 * disimpan sebagai kolom `urutan` di tabel jenjang_pendidikan (migrasi 0014).
 */
const URUTAN_JENJANG: Record<string, number> = {
  SD: 1,
  SMP: 2,
  "SMA/SMK": 3,
  D1: 4,
  D2: 5,
  D3: 6,
  D4: 7,
  S1: 8,
  S2: 9,
  S3: 10,
};

type PendidikanJenjangInfo = {
  id: string;
  jenjang_pendidikan_id: string;
  nama_jenjang: string | null;
};

/**
 * Ambil jenjang tertinggi dari daftar baris pendidikan (pemetaan nama jenjang;
 * kolom `urutan` DB tidak terbaca di service karena master global tidak
 * menyertakannya pada saat query halaman).
 */
function highestJenjangId(
  rows: PendidikanJenjangInfo[]
): string | null {
  let bestId: string | null = null;
  let bestUrutan = -1;
  for (const row of rows) {
    const urutan = row.nama_jenjang ? URUTAN_JENJANG[row.nama_jenjang] ?? 0 : 0;
    if (urutan > bestUrutan) {
      bestUrutan = urutan;
      bestId = row.jenjang_pendidikan_id;
    }
  }
  return bestId;
}

type PendidikanRow = NonNullable<
  SavePegawaiInput["pendidikan"]
>[number];
type SertifikasiRow = NonNullable<
  SavePegawaiInput["sertifikasi"]
>[number];

/**
 * Sinkronisasi penuh (replace-all) baris pendidikan & sertifikasi pegawai:
 * hapus semua baris lama lalu bulk insert daftar final. Setelahnya update
 * `pendidikan_terakhir_id` = jenjang tertinggi dari baris pendidikan.
 * Gagal sinkron TIDAK menggagalkan penyimpanan pegawai.
 */
async function syncPegawaiDetail(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  pegawaiId: string,
  pendidikan: PendidikanRow[],
  sertifikasi: SertifikasiRow[]
): Promise<boolean> {
  // a. Hapus semua baris lama (replace-all).
  const hapusPendidikan = await supabase
    .from("pegawai_pendidikan")
    .delete()
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId);
  if (hapusPendidikan.error) return false;

  const hapusSertifikasi = await supabase
    .from("pegawai_sertifikasi")
    .delete()
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId);
  if (hapusSertifikasi.error) return false;

  // b. Bulk insert daftar final.
  if (pendidikan.length > 0) {
    const { error } = await supabase.from("pegawai_pendidikan").insert(
      pendidikan.map((row) => ({
        school_id: schoolId,
        pegawai_id: pegawaiId,
        jenjang_pendidikan_id: row.jenjang_pendidikan_id || null,
        jurusan: row.jurusan || null,
        nama_institusi: row.nama_institusi || null,
        tahun_lulus: row.tahun_lulus || null,
      }))
    );
    if (error) return false;
  }

  if (sertifikasi.length > 0) {
    const { error } = await supabase.from("pegawai_sertifikasi").insert(
      sertifikasi.map((row) => ({
        school_id: schoolId,
        pegawai_id: pegawaiId,
        nama_sertifikasi: row.nama_sertifikasi,
        tanggal_berlaku: row.tanggal_berlaku || null,
        tanggal_kedaluwarsa: row.tanggal_kedaluwarsa || null,
        nomor_sertifikat: row.nomor_sertifikat || null,
        penerbit: row.penerbit || null,
      }))
    );
    if (error) return false;
  }

  // c. Backfill pendidikan_terakhir_id = jenjang tertinggi dari baris pendidikan.
  const jenjangIds = [
    ...new Set(
      pendidikan
        .map((row) => row.jenjang_pendidikan_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  let pendidikanTerakhirId: string | null = null;
  if (jenjangIds.length > 0) {
    const jenjangResult = await supabase
      .from("jenjang_pendidikan")
      .select("id, nama_jenjang")
      .in("id", jenjangIds);
    if (jenjangResult.error) return false;
    const rows = ((jenjangResult.data ?? []) as {
      id: string;
      nama_jenjang: string | null;
    }[]).map((row) => ({
      id: row.id,
      jenjang_pendidikan_id: row.id,
      nama_jenjang: row.nama_jenjang,
    }));
    pendidikanTerakhirId = highestJenjangId(rows);
  }

  const { error: updateError } = await supabase
    .from("pegawai")
    .update({ pendidikan_terakhir_id: pendidikanTerakhirId })
    .eq("id", pegawaiId)
    .eq("school_id", schoolId);
  if (updateError) return false;

  return true;
}

/**
 * Simpan pegawai (buat bila command tanpa `id`, ubah bila ada).
 * `school_id` SELALU dari user yang login — bukan dari input form.
 * Setelah pegawai tersimpan, daftar jabatan disinkronkan penuh ke
 * pegawai_jabatan (hapus/insert/update is_utama).
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
  const jabatanUtamaId = command.jabatan_utama_id || null;

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

    const syncedJabatan = await syncPegawaiJabatan(
      supabase,
      schoolId,
      command.id,
      command.jabatan_ids,
      jabatanUtamaId
    );
    const syncedDetail = await syncPegawaiDetail(
      supabase,
      schoolId,
      command.id,
      command.pendidikan ?? [],
      command.sertifikasi ?? []
    );
    if (!syncedJabatan || !syncedDetail) {
      return okResult(
        "Pegawai tersimpan, namun gagal menyinkronkan jabatan/detail."
      );
    }
    return okResult(`Data ${command.full_name} berhasil diperbarui.`);
  }

  const insertResult = await supabase
    .from("pegawai")
    .insert(payload)
    .select("id")
    .single();

  if (insertResult.error) {
    return errResult(
      serverError(
        insertResult.error,
        duplicateMessage(insertResult.error) ?? "Gagal menambahkan pegawai."
      )
    );
  }

  const pegawaiId = (insertResult.data as { id: string } | null)?.id;
  if (pegawaiId) {
    const syncedJabatan = await syncPegawaiJabatan(
      supabase,
      schoolId,
      pegawaiId,
      command.jabatan_ids,
      jabatanUtamaId
    );
    const syncedDetail = await syncPegawaiDetail(
      supabase,
      schoolId,
      pegawaiId,
      command.pendidikan ?? [],
      command.sertifikasi ?? []
    );
    if (!syncedJabatan || !syncedDetail) {
      return okResult(
        "Pegawai tersimpan, namun gagal menyinkronkan jabatan/detail."
      );
    }
  }

  return okResult(`Pegawai ${command.full_name} berhasil ditambahkan.`);
}

/** Hapus pegawai milik sekolah yang sedang login (beserta baris detailnya). */
export async function deletePegawaiRecord(
  deps: PegawaiMutationsDeps,
  current: CurrentUser,
  pegawaiId: string
): Promise<MutationResult> {
  const schoolId = current.profile.school_id;

  if (!schoolId) {
    return errResult("Hanya admin sekolah yang boleh mengelola data pegawai.");
  }

  // Hapus detail & pivot dulu (eksplisit; FK cascade hanya lapis cadangan).
  const { error: pendidikanError } = await deps.supabase
    .from("pegawai_pendidikan")
    .delete()
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId);
  if (pendidikanError) {
    return errResult(serverError(pendidikanError, "Gagal menghapus pegawai."));
  }

  const { error: sertifikasiError } = await deps.supabase
    .from("pegawai_sertifikasi")
    .delete()
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId);
  if (sertifikasiError) {
    return errResult(serverError(sertifikasiError, "Gagal menghapus pegawai."));
  }

  const { error: pivotError } = await deps.supabase
    .from("pegawai_jabatan")
    .delete()
    .eq("pegawai_id", pegawaiId)
    .eq("school_id", schoolId);

  if (pivotError) {
    return errResult(serverError(pivotError, "Gagal menghapus pegawai."));
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
