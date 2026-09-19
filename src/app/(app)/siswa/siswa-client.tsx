"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useActionState,
} from "react";
import { toast } from "sonner";
import {
  ImagePlusIcon,
  SearchIcon,
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
import type { FormState, Siswa } from "@/lib/types";
import { deleteSiswa, saveSiswa } from "./actions";
import type { SiswaOptionLists } from "./page";

type Permissions = { create: boolean; update: boolean; delete: boolean };

// Palet referensi: Template-ERP-Sekolah (blok "student management").
const STATUS_PILL: Record<Siswa["status"], string> = {
  aktif: "bg-[#e7f5e9] text-[#2b7254]",
  lulus: "bg-[#e8f2f5] text-[#3a7591]",
  pindah: "bg-[#fcf3e3] text-[#a67437]",
  keluar: "bg-[#fdf0ee] text-[#ad685d]",
};

const STATUS_LABEL: Record<Siswa["status"], string> = {
  aktif: "Aktif",
  lulus: "Lulus",
  pindah: "Pindah",
  keluar: "Keluar",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

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
  const [banner, setBanner] = useState<string | null>(null);
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
      else if (result?.success) {
        toast.success(result.success);
        setBanner(result.success);
      }
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setBanner(null);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Siswa) => {
    setBanner(null);
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">
            Manajemen Orang
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">
            Data Siswa
          </h1>
          <p className="mt-2 text-xs text-[#82978d]">
            Kelola data biodata siswa sekolah.
          </p>
        </div>
        {permissions.create ? (
          <Button
            onClick={openCreate}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <UserPlusIcon data-icon="inline-start" className="size-4" />
            Tambah Siswa
          </Button>
        ) : null}
      </div>

      {banner ? (
        <div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">
          {banner}
        </div>
      ) : null}

      <Card className="rounded-[15px] border-[#e2ece5] bg-white shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 border-b border-[#edf2ee] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">
              Daftar Siswa
            </CardTitle>
            <CardDescription className="mt-1.5 text-[11px] text-[#8b9f95]">
              {filtered.length} dari {siswa.length} siswa
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#91a49a]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, NIS, atau NISN..."
              className="h-[35px] rounded-[9px] border-[#e2ece5] bg-[#fcfdfc] pl-9 text-xs text-[#284a3d] placeholder:text-[#91a49a] focus-visible:border-[#9dc7a8] focus-visible:ring-[#4d986f]/10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#3e5c50]">Belum ada siswa</p>
              <p className="mt-1 text-xs text-[#a0afa8]">
                {permissions.create
                  ? "Tambahkan siswa pertama untuk mulai."
                  : "Hubungi admin sekolah untuk menambahkan data."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 pt-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-[11px] border border-[#e9efeb] bg-[#fcfdfc] px-4 py-3 transition-colors hover:border-[#cfe6d4] hover:bg-[#f6fbf7]"
                >
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-[#def1e2] text-[#2b7254]">
                    {item.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.photo_url}
                        alt={item.nama_lengkap}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold">
                        {getInitials(item.nama_lengkap)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[#2b493e]">
                      {item.nama_lengkap}
                    </p>
                    <p className="truncate text-[10px] text-[#8b9f95]">
                      {[item.nis, item.nisn, agamaName.get(item.agama_id ?? "") ?? null]
                        .filter(Boolean)
                        .join(" · ") || "Tidak ada nomor induk"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-[99px] px-2 py-1 text-[9px] font-bold ${STATUS_PILL[item.status]}`}
                  >
                    {STATUS_LABEL[item.status]}
                  </span>
                  {permissions.update || permissions.delete ? (
                    <div className="flex shrink-0 gap-2">
                      {permissions.update ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-[9px] border-[#e1ebe4] bg-white text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                          onClick={() => openEdit(item)}
                        >
                          Ubah
                        </Button>
                      ) : null}
                      {permissions.delete ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-[9px] border-[#e1ebe4] bg-white text-[10px] font-bold text-[#ad685d] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
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

      <SiswaFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        options={options}
        onSaved={(message) => setBanner(message)}
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Siswa | null;
  options: SiswaOptionLists;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveSiswa,
    undefined
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange, onSaved]);

  // Bersihkan object URL pratinjau setiap kali dialog ditutup.
  const handleOpenChange = (next: boolean) => {
    if (!next && photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      setPhotoName(null);
    }
    onOpenChange(next);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoName(file.name);
  };

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <input type="hidden" name="photo_url" value={editing?.photo_url ?? ""} />

          {/* ===== Foto ===== */}
          <div className="flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#cfe6d4] bg-[#f6fbf7] text-[#9bbfa5]">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Pratinjau foto siswa"
                  className="h-full w-full object-cover"
                />
              ) : editing?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={editing.photo_url}
                  alt={editing.nama_lengkap}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlusIcon className="size-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2b493e]">Foto Siswa</p>
              <p className="mt-1 text-[10px] text-[#93a49c]">
                {photoName ? `Dipilih: ${photoName}. ` : ""}JPG/PNG/WebP maksimal 2 MB.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                name="photo"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-8 rounded-[9px] border-[#d7e6dc] bg-white text-[10px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
                onClick={() => photoInputRef.current?.click()}
              >
                Upload Foto
              </Button>
            </div>
          </div>

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
                autoFocus
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[9px] border border-[#185743] bg-[#185743] text-white hover:bg-[#124936]"
            >
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Siswa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
