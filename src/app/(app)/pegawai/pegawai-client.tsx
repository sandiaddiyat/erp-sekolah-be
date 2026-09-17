"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import {
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Separator } from "@/components/ui/separator";
import type {
  FormState,
  Pegawai,
  PegawaiPendidikan,
  PegawaiSertifikasi,
} from "@/lib/types";
import { deletePegawai, savePegawai } from "./actions";
import type { PegawaiJabatanInfo, PegawaiOptionLists } from "./page";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type Permissions = { create: boolean; update: boolean; delete: boolean };

export function PegawaiClient({
  pegawai,
  options,
  pegawaiJabatan,
  pegawaiPendidikan,
  pegawaiSertifikasi,
  permissions,
}: {
  pegawai: Pegawai[];
  options: PegawaiOptionLists;
  pegawaiJabatan: Record<string, PegawaiJabatanInfo[]>;
  pegawaiPendidikan: Record<string, PegawaiPendidikan[]>;
  pegawaiSertifikasi: Record<string, PegawaiSertifikasi[]>;
  permissions: Permissions;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pegawai | null>(null);
  const [deleting, setDeleting] = useState<Pegawai | null>(null);
  const [isPending, startTransition] = useTransition();

  const statusName = useMemo(
    () => new Map(options.status_kepegawaian.map((item) => [item.id, item.nama_status])),
    [options.status_kepegawaian]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return pegawai;
    return pegawai.filter((item) => {
      const jabatanGabungan = (pegawaiJabatan[item.id] ?? [])
        .map((info) => info.nama)
        .join(" ");
      return [
        item.full_name,
        item.nip ?? "",
        item.niy ?? "",
        item.nuptk ?? "",
        jabatanGabungan,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, pegawai, pegawaiJabatan]);

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deletePegawai(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Pegawai) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Data Pegawai</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data kepegawaian sekolah. Akun login dikelola lewat menu User.
          </p>
        </div>
        {permissions.create ? (
          <Button onClick={openCreate}>
            <UserPlusIcon data-icon="inline-start" />
            Tambah Pegawai
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>Daftar Pegawai</CardTitle>
            <CardDescription>
              {filtered.length} dari {pegawai.length} pegawai
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama atau NIP..."
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada pegawai</p>
              <p className="text-sm text-muted-foreground">
                {permissions.create
                  ? "Tambahkan pegawai pertama untuk mulai."
                  : "Hubungi admin sekolah untuk menambahkan data."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {item.full_name}
                      {!item.is_active ? (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          Nonaktif
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.nip, item.niy, statusName.get(item.status_kepegawaian_id ?? "") ?? null]
                        .filter(Boolean)
                        .join(" • ") || "Tidak ada nomor induk"}
                    </p>
                    {(pegawaiJabatan[item.id] ?? []).length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(pegawaiJabatan[item.id] ?? []).map((info) => (
                          <span
                            key={info.jabatan_id}
                            className={
                              info.is_utama
                                ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                            }
                          >
                            {info.is_utama ? "★ " : ""}
                            {info.nama}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {permissions.update || permissions.delete ? (
                    <div className="flex shrink-0 gap-2">
                      {permissions.update ? (
                        <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                          Ubah
                        </Button>
                      ) : null}
                      {permissions.delete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(item)}
                        >
                          Hapus
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PegawaiFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        options={options}
        jabatanTerpilih={editing ? (pegawaiJabatan[editing.id] ?? []) : []}
        pendidikanAwal={editing ? (pegawaiPendidikan[editing.id] ?? []) : []}
        sertifikasiAwal={editing ? (pegawaiSertifikasi[editing.id] ?? []) : []}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pegawai ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.full_name} akan dihapus permanen dari data pegawai sekolah Anda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type PendidikanFormRow = {
  jenjang_pendidikan_id: string;
  jurusan: string;
  nama_institusi: string;
  tahun_lulus: string;
};

type SertifikasiFormRow = {
  nama_sertifikasi: string;
  tanggal_berlaku: string;
  tanggal_kedaluwarsa: string;
  nomor_sertifikat: string;
  penerbit: string;
};

const emptyPendidikanRow = (): PendidikanFormRow => ({
  jenjang_pendidikan_id: "",
  jurusan: "",
  nama_institusi: "",
  tahun_lulus: "",
});

const emptySertifikasiRow = (): SertifikasiFormRow => ({
  nama_sertifikasi: "",
  tanggal_berlaku: "",
  tanggal_kedaluwarsa: "",
  nomor_sertifikat: "",
  penerbit: "",
});

function PegawaiFormDialog({
  open,
  onOpenChange,
  editing,
  options,
  jabatanTerpilih,
  pendidikanAwal,
  sertifikasiAwal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Pegawai | null;
  options: PegawaiOptionLists;
  jabatanTerpilih: PegawaiJabatanInfo[];
  pendidikanAwal: PegawaiPendidikan[];
  sertifikasiAwal: PegawaiSertifikasi[];
}) {
  const isEdit = Boolean(editing);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [selectedJabatanIds, setSelectedJabatanIds] = useState<string[]>(
    jabatanTerpilih.map((info) => info.jabatan_id)
  );
  const [pendidikanRows, setPendidikanRows] = useState<PendidikanFormRow[]>(
    pendidikanAwal.map((row) => ({
      jenjang_pendidikan_id: row.jenjang_pendidikan_id ?? "",
      jurusan: row.jurusan ?? "",
      nama_institusi: row.nama_institusi ?? "",
      tahun_lulus: row.tahun_lulus ?? "",
    }))
  );
  const [sertifikasiRows, setSertifikasiRows] = useState<SertifikasiFormRow[]>(
    sertifikasiAwal.map((row) => ({
      nama_sertifikasi: row.nama_sertifikasi,
      tanggal_berlaku: row.tanggal_berlaku ?? "",
      tanggal_kedaluwarsa: row.tanggal_kedaluwarsa ?? "",
      nomor_sertifikat: row.nomor_sertifikat ?? "",
      penerbit: row.penerbit ?? "",
    }))
  );
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    savePegawai,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  const inputClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  const jabatanOptions = options.jabatan.map((jabatan) => ({
    value: jabatan.id,
    label: jabatan.nama_jabatan,
  }));

  const updatePendidikanRow = (index: number, patch: Partial<PendidikanFormRow>) => {
    setPendidikanRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const updateSertifikasiRow = (index: number, patch: Partial<SertifikasiFormRow>) => {
    setSertifikasiRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Pegawai" : "Tambah Pegawai"}</DialogTitle>
            <DialogDescription>
              Pegawai belum tentu punya akun login. Akun dibuat lewat menu User.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
          {selectedJabatanIds.map((id) => (
            <input key={id} type="hidden" name="jabatan_ids" value={id} />
          ))}
          <input
            type="hidden"
            name="pendidikan"
            value={JSON.stringify(
              pendidikanRows.map((row) => ({
                jenjang_pendidikan_id: row.jenjang_pendidikan_id || undefined,
                jurusan: row.jurusan || undefined,
                nama_institusi: row.nama_institusi || undefined,
                tahun_lulus: row.tahun_lulus || undefined,
              }))
            )}
          />
          <input
            type="hidden"
            name="sertifikasi"
            value={JSON.stringify(
              sertifikasiRows.map((row) => ({
                nama_sertifikasi: row.nama_sertifikasi || undefined,
                tanggal_berlaku: row.tanggal_berlaku || undefined,
                tanggal_kedaluwarsa: row.tanggal_kedaluwarsa || undefined,
                nomor_sertifikat: row.nomor_sertifikat || undefined,
                penerbit: row.penerbit || undefined,
              }))
            )}
          />

          {/* ===== Identitas ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel htmlFor="full_name" required>
                Nama Lengkap
              </FieldLabel>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={editing?.full_name ?? ""}
                placeholder="Contoh: Ahmad Fauzi, S.Pd"
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="nip" optional>
                NIP
              </FieldLabel>
              <Input id="nip" name="nip" defaultValue={editing?.nip ?? ""} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="niy" optional>
                NIY
              </FieldLabel>
              <Input id="niy" name="niy" defaultValue={editing?.niy ?? ""} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="nuptk" optional>
                NUPTK
              </FieldLabel>
              <Input id="nuptk" name="nuptk" defaultValue={editing?.nuptk ?? ""} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="jenis_kelamin" optional>
                Jenis Kelamin
              </FieldLabel>
              <select
                id="jenis_kelamin"
                name="jenis_kelamin"
                defaultValue={editing?.jenis_kelamin ?? ""}
                className={selectClass}
              >
                <option value="">- tidak diisi -</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tempat_lahir" optional>
                Tempat Lahir
              </FieldLabel>
              <Input id="tempat_lahir" name="tempat_lahir" defaultValue={editing?.tempat_lahir ?? ""} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tanggal_lahir" optional>
                Tanggal Lahir
              </FieldLabel>
              <Input
                id="tanggal_lahir"
                name="tanggal_lahir"
                type="date"
                defaultValue={editing?.tanggal_lahir ?? ""}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="agama_id" optional>
                Agama
              </FieldLabel>
              <select
                id="agama_id"
                name="agama_id"
                defaultValue={editing?.agama_id ?? ""}
                className={selectClass}
              >
                <option value="">- tidak ada -</option>
                {options.agama.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama_agama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* ===== Kepegawaian ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="status_kepegawaian_id" optional>
                Status Kepegawaian
              </FieldLabel>
              <select
                id="status_kepegawaian_id"
                name="status_kepegawaian_id"
                defaultValue={editing?.status_kepegawaian_id ?? ""}
                className={selectClass}
              >
                <option value="">- tidak ada -</option>
                {options.status_kepegawaian.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama_status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel optional>Jabatan (boleh lebih dari satu)</FieldLabel>
              <MultiSelect
                options={jabatanOptions}
                selected={selectedJabatanIds}
                onChange={setSelectedJabatanIds}
                placeholder="Pilih jabatan..."
                emptyText="Belum ada jabatan. Tambahkan lewat menu Master Data."
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="jabatan_utama_id" optional>
                Jabatan Utama
              </FieldLabel>
              <select
                id="jabatan_utama_id"
                name="jabatan_utama_id"
                defaultValue={jabatanTerpilih.find((info) => info.is_utama)?.jabatan_id ?? ""}
                key={selectedJabatanIds.join(",")}
                className={selectClass}
              >
                <option value="">- pilih jabatan utama -</option>
                {options.jabatan
                  .filter((jabatan) => selectedJabatanIds.includes(jabatan.id))
                  .map((jabatan) => (
                    <option key={jabatan.id} value={jabatan.id}>
                      {jabatan.nama_jabatan}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="golongan_id" optional>
                Golongan
              </FieldLabel>
              <select
                id="golongan_id"
                name="golongan_id"
                defaultValue={editing?.golongan_id ?? ""}
                className={selectClass}
              >
                <option value="">- tidak ada -</option>
                {options.golongan.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kode_golongan}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="unit_kerja_id" optional>
                Unit Kerja
              </FieldLabel>
              <select
                id="unit_kerja_id"
                name="unit_kerja_id"
                defaultValue={editing?.unit_kerja_id ?? ""}
                className={selectClass}
              >
                <option value="">- tidak ada -</option>
                {options.unit_kerja.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama_unit}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tahun_masuk" optional>
                Tahun Masuk
              </FieldLabel>
              <Input
                id="tahun_masuk"
                name="tahun_masuk"
                type="date"
                defaultValue={editing?.tahun_masuk ?? ""}
              />
            </div>
            <div className="flex items-center gap-2.5 self-end pb-2">
              <Checkbox
                id="is_active_checkbox"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(Boolean(checked))}
              />
              <Label htmlFor="is_active_checkbox" className="cursor-pointer">
                Pegawai aktif
              </Label>
            </div>
          </div>

          <Separator />

          {/* ===== Riwayat Pendidikan (multi-baris) ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Riwayat Pendidikan</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPendidikanRows((prev) => [...prev, emptyPendidikanRow()])}
              >
                <PlusIcon data-icon="inline-start" />
                Tambah Pendidikan
              </Button>
            </div>
            {pendidikanRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada riwayat pendidikan (semua kolom opsional).
              </p>
            ) : (
              pendidikanRows.map((row, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`pendidikan_jenjang_${index}`}
                      optional
                    >
                      Jenjang
                    </FieldLabel>
                    <select
                      id={`pendidikan_jenjang_${index}`}
                      value={row.jenjang_pendidikan_id}
                      onChange={(event) =>
                        updatePendidikanRow(index, { jenjang_pendidikan_id: event.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="">- tidak ada -</option>
                      {options.jenjang_pendidikan.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nama_jenjang}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`pendidikan_jurusan_${index}`}
                      optional
                    >
                      Jurusan
                    </FieldLabel>
                    <Input
                      id={`pendidikan_jurusan_${index}`}
                      value={row.jurusan}
                      onChange={(event) => updatePendidikanRow(index, { jurusan: event.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`pendidikan_institusi_${index}`}
                      optional
                    >
                      Nama Institusi
                    </FieldLabel>
                    <Input
                      id={`pendidikan_institusi_${index}`}
                      value={row.nama_institusi}
                      onChange={(event) =>
                        updatePendidikanRow(index, { nama_institusi: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="w-full space-y-2">
                      <FieldLabel
                        htmlFor={`pendidikan_tahun_${index}`}
                        optional
                      >
                        Tahun Lulus
                      </FieldLabel>
                      <Input
                        id={`pendidikan_tahun_${index}`}
                        value={row.tahun_lulus}
                        onChange={(event) =>
                          updatePendidikanRow(index, { tahun_lulus: event.target.value })
                        }
                        placeholder="Contoh: 2020"
                        className={inputClass}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Hapus baris pendidikan"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setPendidikanRows((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* ===== Sertifikasi (multi-baris) ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Sertifikasi</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSertifikasiRows((prev) => [...prev, emptySertifikasiRow()])}
              >
                <PlusIcon data-icon="inline-start" />
                Tambah Sertifikasi
              </Button>
            </div>
            {sertifikasiRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Belum ada sertifikasi.
              </p>
            ) : (
              sertifikasiRows.map((row, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`sertifikasi_nama_${index}`}
                      required
                    >
                      Nama Sertifikasi
                    </FieldLabel>
                    <Input
                      id={`sertifikasi_nama_${index}`}
                      value={row.nama_sertifikasi}
                      onChange={(event) =>
                        updateSertifikasiRow(index, { nama_sertifikasi: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`sertifikasi_nomor_${index}`}
                      optional
                    >
                      Nomor Sertifikat
                    </FieldLabel>
                    <Input
                      id={`sertifikasi_nomor_${index}`}
                      value={row.nomor_sertifikat}
                      onChange={(event) =>
                        updateSertifikasiRow(index, { nomor_sertifikat: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`sertifikasi_berlaku_${index}`}
                      optional
                    >
                      Tanggal Berlaku
                    </FieldLabel>
                    <Input
                      id={`sertifikasi_berlaku_${index}`}
                      type="date"
                      value={row.tanggal_berlaku}
                      onChange={(event) =>
                        updateSertifikasiRow(index, { tanggal_berlaku: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel
                      htmlFor={`sertifikasi_kedaluwarsa_${index}`}
                      optional
                    >
                      Tanggal Kedaluwarsa
                    </FieldLabel>
                    <Input
                      id={`sertifikasi_kedaluwarsa_${index}`}
                      type="date"
                      value={row.tanggal_kedaluwarsa}
                      onChange={(event) =>
                        updateSertifikasiRow(index, { tanggal_kedaluwarsa: event.target.value })
                      }
                      className={inputClass}
                    />
                  </div>
                  <div className="flex items-end gap-2 sm:col-span-2">
                    <div className="w-full space-y-2">
                      <FieldLabel
                        htmlFor={`sertifikasi_penerbit_${index}`}
                        optional
                      >
                        Penerbit
                      </FieldLabel>
                      <Input
                        id={`sertifikasi_penerbit_${index}`}
                        value={row.penerbit}
                        onChange={(event) =>
                          updateSertifikasiRow(index, { penerbit: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Hapus baris sertifikasi"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setSertifikasiRows((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* ===== Kontak ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="phone" optional>
                Telepon
              </FieldLabel>
              <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} placeholder="08xx" />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="email" optional>
                Email
              </FieldLabel>
              <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel htmlFor="alamat" optional>
                Alamat
              </FieldLabel>
              <Input id="alamat" name="alamat" defaultValue={editing?.alamat ?? ""} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Pegawai"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
