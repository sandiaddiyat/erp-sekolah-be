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
import type { EducationLevel } from "@/lib/types";
import { saveEducationLevel, deleteEducationLevel } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

export function JenjangClient({
  jenjangs,
  canManage,
}: {
  jenjangs: EducationLevel[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EducationLevel | null>(null);
  const [deleting, setDeleting] = useState<EducationLevel | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = jenjangs.filter((j) =>
    (j.code + " " + j.name).toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteEducationLevel(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Jenjang Pendidikan</h1>
          <p className="text-sm text-muted-foreground">
            Definisikan jenjang pendidikan sekolah (TK, SD, SMP, SMA, SMK).
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Jenjang
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari jenjang..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Jenjang Pendidikan</CardTitle>
          <CardDescription>{filtered.length} dari {jenjangs.length} jenjang</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada jenjang</p>
              {canManage && <p className="text-sm text-muted-foreground mt-1">Tambahkan jenjang pertama.</p>}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code}</p>
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

      <FormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jenjang ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.name} (${deleting.code}) akan dihapus permanen.` : ""}
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: EducationLevel | null;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveEducationLevel, undefined);

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
            <DialogTitle>{isEdit ? "Ubah Jenjang" : "Tambah Jenjang"}</DialogTitle>
            <DialogDescription>Data ini hanya berlaku untuk sekolah Anda.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input id="code" name="code" defaultValue={editing?.code ?? ""} placeholder="SD" required={!isEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Sekolah Dasar" required={!isEdit} />
            </div>
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
