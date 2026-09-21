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
import { Checkbox } from "@/components/ui/checkbox";
import type { AcademicYear, AcademicYearStatus } from "@/lib/types";
import { saveAcademicYear, deleteAcademicYear } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30";

const STATUS_LABELS: Record<AcademicYearStatus, string> = {
  draft: "Draft",
  active: "Aktif",
  closed: "Ditutup",
};

export function AcademicYearClient({
  academicYears,
  canManage,
}: {
  academicYears: AcademicYear[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [deleting, setDeleting] = useState<AcademicYear | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = academicYears.filter((y) =>
    y.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteAcademicYear(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Tahun Ajaran</h1>
          <p className="text-sm text-muted-foreground">
            Kelola tahun ajaran sekolah. Hanya satu tahun ajaran yang dapat dijadikan aktif.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Tahun Ajaran
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari tahun ajaran..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Tahun Ajaran</CardTitle>
          <CardDescription>{filtered.length} dari {academicYears.length} tahun ajaran</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada tahun ajaran</p>
              {canManage && <p className="text-sm text-muted-foreground mt-1">Tambahkan tahun ajaran pertama.</p>}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === "active" ? "bg-emerald-500/10 text-emerald-700" :
                        item.status === "closed" ? "bg-gray-500/10 text-gray-700" :
                        "bg-blue-500/10 text-blue-700"
                      }`}>
                        {STATUS_LABELS[item.status]}
                      </span>
                      {item.is_active && (
                        <span className="text-xs text-muted-foreground">Aktif</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.start_date} → {item.end_date}
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

      <FormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tahun ajaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.name} akan dihapus permanen. Data yang masih dipakai tidak bisa dihapus.` : ""}
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
  editing: AcademicYear | null;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveAcademicYear, undefined);

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
            <DialogTitle>{isEdit ? "Ubah Tahun Ajaran" : "Tambah Tahun Ajaran"}</DialogTitle>
            <DialogDescription>Data ini hanya berlaku untuk sekolah Anda.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nama Tahun Ajaran</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="2025/2026" required={!isEdit} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Tanggal Mulai</Label>
              <Input id="start_date" name="start_date" type="date" defaultValue={editing?.start_date?.slice(0, 10) ?? ""} required={!isEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">Tanggal Selesai</Label>
              <Input id="end_date" name="end_date" type="date" defaultValue={editing?.end_date?.slice(0, 10) ?? ""} required={!isEdit} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={editing?.status ?? "draft"}
              className={SELECT_CLASS}
              required
            >
              <option value="draft">Draft</option>
              <option value="active">Aktif</option>
              <option value="closed">Ditutup</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox id="is_active" name="is_active" defaultChecked={Boolean(editing?.is_active)} />
            <Label htmlFor="is_active" className="cursor-pointer">Jadikan tahun ajaran ini aktif</Label>
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
