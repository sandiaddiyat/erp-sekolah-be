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
import { Badge } from "@/components/ui/badge";
import type { FormState, Siswa } from "@/lib/types";
import { deleteSiswa, saveSiswa } from "./actions";
import type { SiswaOptionLists } from "./page";

type Permissions = { create: boolean; update: boolean; delete: boolean };

export function SiswaClient({
  siswa,
  options,
  permissions,
}: {
  siswa: Siswa[];
  options: SiswaOptionLists;
  permissions: Permissions;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState<Siswa | null>(null);
  const [isPending, startTransition] = useTransition();

  const agamaName = useMemo(
    () => new Map(options.agama.map((item) => [item.id, item.nama_agama])),
    [options.agama]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return siswa;
    return siswa.filter((item) =>
      [item.nama_lengkap, item.nis ?? "", item.nisn ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, siswa]);

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteSiswa(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Siswa) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Data Siswa</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data biodata siswa sekolah.
          </p>
        </div>
        {permissions.create ? (
          <Button onClick={openCreate}>
            <UserPlusIcon data-icon="inline-start" />
            Tambah Siswa
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>Daftar Siswa</CardTitle>
            <CardDescription>
              {filtered.length} dari {siswa.length} siswa
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, NIS, atau NISN..."
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada siswa</p>
              <p className="text-sm text-muted-foreground">
                {permissions.create
                  ? "Tambahkan siswa pertama untuk mulai."
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
                      {item.nama_lengkap}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[item.nis, item.nisn, agamaName.get(item.agama_id ?? "") ?? null]
                        .filter(Boolean)
                        .join(" • ") || "Tidak ada nomor induk"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        item.status === "aktif"
                          ? "default"
                          : item.status === "lulus"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SiswaFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        options={options}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.nama_lengkap} akan dihapus permanen dari data siswa
              sekolah Anda.
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

function SiswaFormDialog({
  open,
  onOpenChange,
  editing,
  options,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Siswa | null;
  options: SiswaOptionLists;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveSiswa,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Siswa" : "Tambah Siswa"}</DialogTitle>
            <DialogDescription>
              Isi data biodata siswa. Nomor induk (NIS/NISN) dapat salah satu
              diisi, atau keduanya.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          {/* ===== Identitas ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nama_lengkap">Nama Lengkap</Label>
              <Input
                id="nama_lengkap"
                name="nama_lengkap"
                defaultValue={editing?.nama_lengkap ?? ""}
                placeholder="Contoh: Budi Santoso"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nis">NIS</Label>
              <Input
                id="nis"
                name="nis"
                defaultValue={editing?.nis ?? ""}
                placeholder="Nomor Induk Siswa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nisn">NISN</Label>
              <Input id="nisn" name="nisn" defaultValue={editing?.nisn ?? ""} />
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
              <Input
                id="tempat_lahir"
                name="tempat_lahir"
                defaultValue={editing?.tempat_lahir ?? ""}
              />
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
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="agama_id">Agama</Label>
              <select
                id="agama_id"
                name="agama_id"
                defaultValue={editing?.agama_id ?? ""}
                className={selectClass}
              >
                <option value="">- tidak diisi -</option>
                {selectOptions(options.agama, "nama_agama").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Separator />

          {/* ===== Wali ===== */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nama_ayah">Nama Ayah</Label>
              <Input
                id="nama_ayah"
                name="nama_ayah"
                defaultValue={editing?.nama_ayah ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama_ibu">Nama Ibu</Label>
              <Input
                id="nama_ibu"
                name="nama_ibu"
                defaultValue={editing?.nama_ibu ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nama_wali">Nama Wali</Label>
              <Input
                id="nama_wali"
                name="nama_wali"
                defaultValue={editing?.nama_wali ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="telepon_wali">Telepon Wali</Label>
              <Input
                id="telepon_wali"
                name="telepon_wali"
                defaultValue={editing?.telepon_wali ?? ""}
                placeholder="08xx"
              />
            </div>
          </div>

          <Separator />

          {/* ===== Alamat ===== */}
          <div className="space-y-2">
            <Label htmlFor="alamat">Alamat</Label>
            <Input
              id="alamat"
              name="alamat"
              defaultValue={editing?.alamat ?? ""}
            />
          </div>

          {/* ===== Status ===== */}
          <div className="space-y-2">
            <Label htmlFor="status_select">Status</Label>
            <select
              id="status_select"
              name="status"
              defaultValue={editing?.status ?? "aktif"}
              className={selectClass}
            >
              <option value="aktif">Aktif</option>
              <option value="lulus">Lulus</option>
              <option value="pindah">Pindah</option>
              <option value="keluar">Keluar</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Siswa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
