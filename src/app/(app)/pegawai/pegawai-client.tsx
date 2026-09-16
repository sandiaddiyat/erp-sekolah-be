"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { SearchIcon, UserPlusIcon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import type { FormState, Pegawai } from "@/lib/types";
import { deletePegawai, savePegawai } from "./actions";
import type { PegawaiJabatanInfo, PegawaiOptionLists } from "./page";

type Permissions = { create: boolean; update: boolean; delete: boolean };

export function PegawaiClient({
  pegawai,
  options,
  pegawaiJabatan,
  permissions,
}: {
  pegawai: Pegawai[];
  options: PegawaiOptionLists;
  pegawaiJabatan: Record<string, PegawaiJabatanInfo[]>;
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

function selectOptions(
  items: { id: string; [key: string]: unknown }[],
  labelKey: string
): { value: string; label: string }[] {
  return items.map((item) => ({ value: item.id, label: String(item[labelKey]) }));
}

function PegawaiFormDialog({
  open,
  onOpenChange,
  editing,
  options,
  jabatanTerpilih,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Pegawai | null;
  options: PegawaiOptionLists;
  jabatanTerpilih: PegawaiJabatanInfo[];
}) {
  const isEdit = Boolean(editing);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [selectedJabatanIds, setSelectedJabatanIds] = useState<string[]>(
    jabatanTerpilih.map((info) => info.jabatan_id)
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

  const renderSelect = (
    name: string,
    label: string,
    items: { id: string; [key: string]: unknown }[],
    labelKey: string,
    defaultValue?: string | null
  ) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} name={name} defaultValue={defaultValue ?? ""} className={selectClass}>
        <option value="">- tidak ada -</option>
        {selectOptions(items, labelKey).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

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

          {/* ===== Identitas ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={editing?.full_name ?? ""}
                placeholder="Contoh: Ahmad Fauzi, S.Pd"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input id="nip" name="nip" defaultValue={editing?.nip ?? ""} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niy">NIY</Label>
              <Input id="niy" name="niy" defaultValue={editing?.niy ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nuptk">NUPTK</Label>
              <Input id="nuptk" name="nuptk" defaultValue={editing?.nuptk ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
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
              <Label htmlFor="tempat_lahir">Tempat Lahir</Label>
              <Input id="tempat_lahir" name="tempat_lahir" defaultValue={editing?.tempat_lahir ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tanggal_lahir">Tanggal Lahir</Label>
              <Input
                id="tanggal_lahir"
                name="tanggal_lahir"
                type="date"
                defaultValue={editing?.tanggal_lahir ?? ""}
              />
            </div>
            {renderSelect("agama_id", "Agama", options.agama, "nama_agama", editing?.agama_id)}
          </div>

          <Separator />

          {/* ===== Kepegawaian ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            {renderSelect(
              "status_kepegawaian_id",
              "Status Kepegawaian",
              options.status_kepegawaian,
              "nama_status",
              editing?.status_kepegawaian_id
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label>Jabatan (boleh lebih dari satu)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {options.jabatan.map((jabatan) => {
                  const checked = selectedJabatanIds.includes(jabatan.id);
                  return (
                    <div key={jabatan.id} className="flex items-center gap-2.5">
                      <Checkbox
                        id={`jabatan_${jabatan.id}`}
                        checked={checked}
                        onCheckedChange={(next) => {
                          setSelectedJabatanIds((prev) =>
                            next
                              ? [...prev, jabatan.id]
                              : prev.filter((id) => id !== jabatan.id)
                          );
                        }}
                      />
                      <Label
                        htmlFor={`jabatan_${jabatan.id}`}
                        className="cursor-pointer font-normal"
                      >
                        {jabatan.nama_jabatan}
                      </Label>
                    </div>
                  );
                })}
              </div>
              {options.jabatan.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Belum ada jabatan. Tambahkan lewat menu Master Data.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jabatan_utama_id">Jabatan Utama</Label>
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
            {renderSelect("golongan_id", "Golongan", options.golongan, "kode_golongan", editing?.golongan_id)}
            {renderSelect("unit_kerja_id", "Unit Kerja", options.unit_kerja, "nama_unit", editing?.unit_kerja_id)}
            <div className="space-y-2">
              <Label htmlFor="tahun_masuk">Tahun Masuk</Label>
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

          {/* ===== Pendidikan ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            {renderSelect(
              "pendidikan_terakhir_id",
              "Pendidikan Terakhir",
              options.jenjang_pendidikan,
              "nama_jenjang",
              editing?.pendidikan_terakhir_id
            )}
            {renderSelect("jurusan_id", "Jurusan", options.jurusan, "nama_jurusan", editing?.jurusan_id)}
            {renderSelect(
              "jenis_sertifikasi_id",
              "Jenis Sertifikasi",
              options.jenis_sertifikasi,
              "nama_sertifikasi",
              editing?.jenis_sertifikasi_id
            )}
          </div>

          <Separator />

          {/* ===== Kontak & Rekening ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} placeholder="08xx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="alamat">Alamat</Label>
              <Input id="alamat" name="alamat" defaultValue={editing?.alamat ?? ""} />
            </div>
            {renderSelect("bank_id", "Bank", options.bank, "nama_bank", editing?.bank_id)}
            <div className="space-y-2">
              <Label htmlFor="no_rekening">Nomor Rekening</Label>
              <Input id="no_rekening" name="no_rekening" defaultValue={editing?.no_rekening ?? ""} />
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
