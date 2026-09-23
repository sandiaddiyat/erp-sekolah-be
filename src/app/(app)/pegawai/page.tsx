import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type {
  Pegawai,
  PegawaiPendidikan,
  PegawaiSertifikasi,
} from "@/lib/types";
import { PegawaiClient } from "./pegawai-client";
import { uploadPegawaiPhotoAction } from "./upload-photo-action";

export const metadata = { title: "Data Pegawai" };

export type PegawaiOptionLists = {
  agama: { id: string; nama_agama: string }[];
  status_kepegawaian: { id: string; nama_status: string }[];
  jabatan: { id: string; nama_jabatan: string; kategori: string }[];
  golongan: { id: string; kode_golongan: string; keterangan: string | null }[];
  unit_kerja: { id: string; nama_unit: string }[];
  jenjang_pendidikan: { id: string; nama_jenjang: string }[];
};

export type PegawaiJabatanInfo = {
  jabatan_id: string;
  nama: string;
  is_utama: boolean;
};

function groupByPegawai<T extends { pegawai_id: string }>(
  rows: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const row of rows) {
    (grouped[row.pegawai_id] ??= []).push(row);
  }
  return grouped;
}

export default async function PegawaiPage() {
  const current = await requirePermission(PERMISSIONS.pegawaiView);
  const supabase = await createClient();

  const [
    pegawaiResult,
    agamaResult,
    statusResult,
    jabatanResult,
    golonganResult,
    unitResult,
    jenjangResult,
    pegawaiJabatanResult,
    pendidikanResult,
    sertifikasiResult,
  ] = await Promise.all([
    supabase
      .from("pegawai")
      .select("*")
      .order("full_name"),
    supabase.from("agama").select("id, nama_agama").order("nama_agama"),
    supabase
      .from("status_kepegawaian")
      .select("id, nama_status")
      .order("nama_status"),
    supabase.from("jabatan").select("id, nama_jabatan, kategori").order("nama_jabatan"),
    supabase
      .from("golongan")
      .select("id, kode_golongan, keterangan")
      .order("kode_golongan"),
    supabase.from("unit_kerja").select("id, nama_unit").order("nama_unit"),
    supabase
      .from("jenjang_pendidikan")
      .select("id, nama_jenjang")
      .order("nama_jenjang"),
    supabase
      .from("pegawai_jabatan")
      .select("pegawai_id, jabatan_id, is_utama"),
    supabase
      .from("pegawai_pendidikan")
      .select("*")
      .order("created_at"),
    supabase
      .from("pegawai_sertifikasi")
      .select("*")
      .order("created_at"),
  ]);

  const loadError =
    pegawaiResult.error ??
    agamaResult.error ??
    statusResult.error ??
    jabatanResult.error ??
    golonganResult.error ??
    unitResult.error ??
    jenjangResult.error ??
    pegawaiJabatanResult.error ??
    pendidikanResult.error ??
    sertifikasiResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data pegawai." />;
  }

  const options: PegawaiOptionLists = {
    agama: (agamaResult.data ?? []) as PegawaiOptionLists["agama"],
    status_kepegawaian: (statusResult.data ?? []) as PegawaiOptionLists["status_kepegawaian"],
    jabatan: (jabatanResult.data ?? []) as PegawaiOptionLists["jabatan"],
    golongan: (golonganResult.data ?? []) as PegawaiOptionLists["golongan"],
    unit_kerja: (unitResult.data ?? []) as PegawaiOptionLists["unit_kerja"],
    jenjang_pendidikan: (jenjangResult.data ?? []) as PegawaiOptionLists["jenjang_pendidikan"],
  };

  const pegawai = (pegawaiResult.data ?? []) as Pegawai[];

  const jabatanNama = new Map(
    options.jabatan.map((item) => [item.id, item.nama_jabatan])
  );

  const pegawaiJabatan: Record<string, PegawaiJabatanInfo[]> = {};
  for (const row of (pegawaiJabatanResult.data ?? []) as {
    pegawai_id: string;
    jabatan_id: string;
    is_utama: boolean;
  }[]) {
    const nama = jabatanNama.get(row.jabatan_id);
    if (!nama) continue;
    (pegawaiJabatan[row.pegawai_id] ??= []).push({
      jabatan_id: row.jabatan_id,
      nama,
      is_utama: row.is_utama,
    });
  }

  return (
    <PegawaiClient
      pegawai={pegawai}
      options={options}
      pegawaiJabatan={pegawaiJabatan}
      pegawaiPendidikan={groupByPegawai(
        (pendidikanResult.data ?? []) as PegawaiPendidikan[]
      )}
      pegawaiSertifikasi={groupByPegawai(
        (sertifikasiResult.data ?? []) as PegawaiSertifikasi[]
      )}
      permissions={{
        create: can(current.permissions, PERMISSIONS.pegawaiCreate, current.isSuperAdmin),
        update: can(current.permissions, PERMISSIONS.pegawaiUpdate, current.isSuperAdmin),
        delete: can(current.permissions, PERMISSIONS.pegawaiDelete, current.isSuperAdmin),
      }}
      uploadPegawaiPhotoAction={uploadPegawaiPhotoAction}
      schoolId={current.profile.school_id ?? ""}
    />
  );
}
