"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EducationLevel, Major } from "@/lib/types";
import { saveMajor, deleteMajor } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30";

export function JurusanClient({
  majors,
  levels,
  canManage,
}: {
  majors: Major[];
  levels: EducationLevel[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Major | null>(null);
  const [deleting, setDeleting] = useState<Major | null>(null);
  const [isPending, startTransition] = useTransition();

  const levelName = (id: string) =>
    levels.find((l) => l.id === id)?.name ?? "-";

  const filtered = majors.filter((m) =>
    (m.name + " " + levelName(m.education_level_id))
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteMajor(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Jurusan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola jurusan khusus SMA/SMK, terkait dengan jenjang pendidikan.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Jurusan
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari jurusan..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Jurusan</CardTitle>
          <CardDescription>{filtered.length} dari {majors.length} jurusan</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada jurusan</p>
              {canManage && <p className="text-sm text-muted-foreground mt-1">Tambahkan jurusan pertama.</p>}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Jenjang: {levelName(item.education_level_id)}
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(item); setFormOpen(true); }}>Ubah</Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleting(item)}>Hapus</Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <FormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} levels={levels} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jurusan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.name} akan dihapus permanen.` : ""}
              Jurusan yang masih dipakai kelas tidak bisa dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormDialog({
  open,
  onOpenChange,
  editing,
  levels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Major | null;
  levels: EducationLevel[];
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveMajor, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) toast.error(state.error);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Jurusan" : "Tambah Jurusan"}</DialogTitle>
            <DialogDescription>Data ini hanya berlaku untuk sekolah Anda.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="education_level_id">Jenjang</Label>
            <select
              id="education_level_id"
              name="education_level_id"
              defaultValue={editing?.education_level_id ?? ""}
              className={SELECT_CLASS}
              required
            >
              <option value="">- pilih jenjang -</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Jurusan</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Contoh: IPA / IPS / TKJ" required={!isEdit} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
