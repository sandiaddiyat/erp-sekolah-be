import { z } from "zod";

/**
 * Kontrak input untuk CRUD master data (per-tenant).
 * Satu Zod schema per entitas; parsing FormData dipusatkan di sini agar
 * service bebas dari detail form.
 */

export const MASTER_ENTITIES = [
  "status_kepegawaian",
  "jabatan",
  "golongan",
  "unit_kerja",
  "mapel",
  "jurusan",
  "jenis_sertifikasi",
  "jenis_cuti_izin",
  "tahun_ajaran",
] as const;

export type MasterEntity = (typeof MASTER_ENTITIES)[number];

export const MASTER_LABELS: Record<MasterEntity, string> = {
  status_kepegawaian: "Status Kepegawaian",
  jabatan: "Jabatan",
  golongan: "Golongan",
  unit_kerja: "Unit Kerja",
  mapel: "Mata Pelajaran",
  jurusan: "Jurusan",
  jenis_sertifikasi: "Jenis Sertifikasi",
  jenis_cuti_izin: "Jenis Cuti / Izin",
  tahun_ajaran: "Tahun Ajaran",
};

const requiredName = (min: number, label: string) =>
  z.string().trim().min(min, `${label} minimal ${min} karakter`);

const optionalDate = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Format tanggal tidak valid.");

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || z.uuid().safeParse(v).success, "ID tidak valid.");

export const saveMasterSchemas = {
  status_kepegawaian: z.object({
    nama_status: requiredName(2, "Nama status"),
  }),
  jabatan: z.object({
    nama_jabatan: requiredName(2, "Nama jabatan"),
    kategori: z.enum(["struktural", "fungsional"]).default("fungsional"),
  }),
  golongan: z.object({
    kode_golongan: requiredName(1, "Kode golongan"),
    keterangan: z.string().trim().optional(),
  }),
  unit_kerja: z.object({
    nama_unit: requiredName(2, "Nama unit"),
    parent_unit_id: optionalUuid,
  }),
  mapel: z.object({
    nama_mapel: requiredName(2, "Nama mata pelajaran"),
    kode_mapel: requiredName(1, "Kode mapel"),
  }),
  jurusan: z.object({
    nama_jurusan: requiredName(2, "Nama jurusan"),
  }),
  jenis_sertifikasi: z.object({
    nama_sertifikasi: requiredName(2, "Nama sertifikasi"),
  }),
  jenis_cuti_izin: z.object({
    nama_jenis: requiredName(2, "Nama jenis cuti/izin"),
    kuota_hari: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d+$/.test(v), "Kuota hari harus angka."),
  }),
  tahun_ajaran: z
    .object({
      nama_tahun_ajaran: z
        .string()
        .trim()
        .regex(/^\d{4}\/\d{4}$/, "Format tahun ajaran: 2025/2026"),
      semester: z.enum(["ganjil", "genap"]),
      tanggal_mulai: optionalDate,
      tanggal_selesai: optionalDate,
      status_aktif: z.boolean().default(false),
    })
    .refine(
      (data) =>
        !data.tanggal_mulai ||
        !data.tanggal_selesai ||
        data.tanggal_selesai >= data.tanggal_mulai,
      { message: "Tanggal selesai tidak boleh sebelum tanggal mulai." }
    ),
} satisfies Record<MasterEntity, z.ZodTypeAny>;

/** Data siap simpan (kolom payload untuk satu baris master). */
export type MasterPayload = Record<string, unknown>;

export type SaveMasterParseResult =
  | { ok: true; payload: MasterPayload }
  | { ok: false; error: string };

function readCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on" || value === "1";
}

/**
 * Baca + validasi FormData form master sesuai entitasnya, lalu susun payload.
 * Satu-satunya tempat yang tahu nama-nama field form master.
 */
export function readSaveMasterInput(
  entity: MasterEntity,
  formData: FormData
): SaveMasterParseResult {
  const parsed = saveMasterSchemas[entity].safeParse({
    nama_status: formData.get("nama_status") ?? undefined,
    nama_jabatan: formData.get("nama_jabatan") ?? undefined,
    kategori: formData.get("kategori") ?? undefined,
    kode_golongan: formData.get("kode_golongan") ?? undefined,
    keterangan: formData.get("keterangan") ?? "",
    nama_unit: formData.get("nama_unit") ?? undefined,
    parent_unit_id: formData.get("parent_unit_id") ?? "",
    nama_mapel: formData.get("nama_mapel") ?? undefined,
    kode_mapel: formData.get("kode_mapel") ?? undefined,
    nama_jurusan: formData.get("nama_jurusan") ?? undefined,
    nama_sertifikasi: formData.get("nama_sertifikasi") ?? undefined,
    nama_jenis: formData.get("nama_jenis") ?? undefined,
    kuota_hari: formData.get("kuota_hari") ?? "",
    nama_tahun_ajaran: formData.get("nama_tahun_ajaran") ?? undefined,
    semester: formData.get("semester") ?? undefined,
    tanggal_mulai: formData.get("tanggal_mulai") ?? "",
    tanggal_selesai: formData.get("tanggal_selesai") ?? "",
    status_aktif: readCheckbox(formData.get("status_aktif")),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data tidak valid.",
    };
  }

  const data = parsed.data as Record<string, unknown>;
  const payload: MasterPayload = {};

  switch (entity) {
    case "status_kepegawaian":
      payload.nama_status = data.nama_status;
      break;
    case "jabatan":
      payload.nama_jabatan = data.nama_jabatan;
      payload.kategori = data.kategori;
      break;
    case "golongan":
      payload.kode_golongan = data.kode_golongan;
      payload.keterangan = (data.keterangan as string) || null;
      break;
    case "unit_kerja":
      payload.nama_unit = data.nama_unit;
      payload.parent_unit_id = (data.parent_unit_id as string) || null;
      break;
    case "mapel":
      payload.nama_mapel = data.nama_mapel;
      payload.kode_mapel = data.kode_mapel;
      break;
    case "jurusan":
      payload.nama_jurusan = data.nama_jurusan;
      break;
    case "jenis_sertifikasi":
      payload.nama_sertifikasi = data.nama_sertifikasi;
      break;
    case "jenis_cuti_izin":
      payload.nama_jenis = data.nama_jenis;
      payload.kuota_hari = data.kuota_hari ? Number(data.kuota_hari) : null;
      break;
    case "tahun_ajaran":
      payload.nama_tahun_ajaran = data.nama_tahun_ajaran;
      payload.semester = data.semester;
      payload.tanggal_mulai = (data.tanggal_mulai as string) || null;
      payload.tanggal_selesai = (data.tanggal_selesai as string) || null;
      payload.status_aktif = data.status_aktif;
      break;
  }

  return { ok: true, payload };
}
