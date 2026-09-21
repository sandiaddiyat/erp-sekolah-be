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
import type { Room } from "@/lib/types";
import { saveRoom, deleteRoom } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

export function RuanganClient({
  rooms,
  canManage,
}: {
  rooms: Room[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = rooms.filter((r) =>
    (r.name + " " + (r.type ?? "")).toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteRoom(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Ruangan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola daftar ruangan sekolah (kelas, laboratorium, dll).
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Ruangan
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari ruangan..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Ruangan</CardTitle>
          <CardDescription>{filtered.length} dari {rooms.length} ruangan</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada ruangan</p>
              {canManage && <p className="text-sm text-muted-foreground mt-1">Tambahkan ruangan pertama.</p>}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.type ? <p className="text-xs text-muted-foreground">{item.type}</p> : null}
                    {item.capacity ? <p className="text-xs text-muted-foreground">Kapasitas: {item.capacity}</p> : null}
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

      {canManage && (
        <>
          <FormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
          <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus ruangan ini?</AlertDialogTitle>
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
        </>
      )}
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
  editing: Room | null;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveRoom, undefined);

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
            <DialogTitle>{isEdit ? "Ubah Ruangan" : "Tambah Ruangan"}</DialogTitle>
            <DialogDescription>Data ini hanya berlaku untuk sekolah Anda.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Ruangan</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Ruang 101" required={!isEdit} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipe</Label>
            <Input id="type" name="type" defaultValue={editing?.type ?? ""} placeholder="Kelas / Laboratorium" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Kapasitas</Label>
            <Input id="capacity" name="capacity" type="number" defaultValue={editing?.capacity ?? ""} min={0} placeholder="30" />
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
