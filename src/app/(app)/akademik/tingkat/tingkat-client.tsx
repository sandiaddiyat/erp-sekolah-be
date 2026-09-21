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
import type { Grade, EducationLevel } from "@/lib/types";
import { saveGrade, deleteGrade } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30";

export function TingkatClient({
  grades,
  educationLevels,
  canManage,
}: {
  grades: Grade[];
  educationLevels: EducationLevel[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Grade | null>(null);
  const [deleting, setDeleting] = useState<Grade | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = grades.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase())
  );

  const levelOptions = educationLevels.map((l) => ({ value: l.id, label: `${l.code} - ${l.name}` }));

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteGrade(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Tingkat</h1>
          <p className="text-sm text-muted-foreground">
            Definisikan tingkat/kelas pada setiap jenjang pendidikan.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Tingkat
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari tingkat..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Tingkat</CardTitle>
          <CardDescription>{filtered.length} dari {grades.length} tingkat</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada tingkat</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan tingkat pertama.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const level = educationLevels.find((l) => l.id === item.education_level_id);
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {level ? `${level.code} - ${level.name}` : item.education_level_id}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setEditing(item); setFormOpen(true); }}>Ubah</Button>
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleting(item)}>Hapus</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && <FormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} levelOptions={levelOptions} />}

      {canManage && (
        <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tingkat ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.name} akan dihapus permanen.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function FormDialog({
  open,
  onOpenChange,
  editing,
  levelOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Grade | null;
  levelOptions: { value: string; label: string }[];
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveGrade, undefined);

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
            <DialogTitle>{isEdit ? "Ubah Tingkat" : "Tambah Tingkat"}</DialogTitle>
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
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Tingkat</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Kelas 1" required={!isEdit} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort_order">Urutan</Label>
            <Input id="sort_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? 0} min={0} />
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
