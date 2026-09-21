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
import type { Class as SchoolClass, AcademicYear, Grade, Major, Room } from "@/lib/types";
import { saveClass, deleteClass } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

type PegawaiSimple = { id: string; full_name: string };

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30";

export function KelasClient({
  classes,
  academicYears,
  grades,
  majors,
  rooms,
  teachers,
  canManage,
}: {
  classes: SchoolClass[];
  academicYears: AcademicYear[];
  grades: Grade[];
  majors: Major[];
  rooms: Room[];
  teachers: PegawaiSimple[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = classes.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  const yearOptions = academicYears.map((y) => ({ value: y.id, label: y.name }));
  const gradeOptions = grades.map((g) => ({ value: g.id, label: g.name }));

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteClass(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Kelas</h1>
          <p className="text-sm text-muted-foreground">
            Kelola rombel kelas per tahun ajaran.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Kelas
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kelas..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Kelas</CardTitle>
          <CardDescription>{filtered.length} dari {classes.length} kelas</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada kelas</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan kelas pertama.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {academicYears.find((y) => y.id === item.academic_year_id)?.name ?? item.academic_year_id}
                      {majors.find((m) => m.id === item.major_id)?.name
                        ? ` · ${majors.find((m) => m.id === item.major_id)!.name}`
                        : null}
                      {rooms.find((r) => r.id === item.room_id)?.name
                        ? ` · ${rooms.find((r) => r.id === item.room_id)!.name}`
                        : null}
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

      {canManage && (
        <>
          <FormDialog
            open={formOpen} onOpenChange={setFormOpen} editing={editing}
            yearOptions={yearOptions} levelOptions={gradeOptions}
            majors={majors} rooms={rooms} teachers={teachers}
          />

          <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus kelas ini?</AlertDialogTitle>
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
  yearOptions,
  levelOptions,
  majors,
  rooms,
  teachers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SchoolClass | null;
  yearOptions: { value: string; label: string }[];
  levelOptions: { value: string; label: string }[];
  majors: Major[];
  rooms: Room[];
  teachers: PegawaiSimple[];
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveClass, undefined);

  useEffect(() => {
    if (state?.success) { toast.success(state.success); onOpenChange(false); }
    else if (state?.error) toast.error(state.error);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>Data ini hanya berlaku untuk sekolah Anda.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="academic_year_id">Tahun Ajaran</Label>
            <select
              id="academic_year_id"
              name="academic_year_id"
              defaultValue={editing?.academic_year_id ?? ""}
              className={SELECT_CLASS}
              required
            >
              <option value="">- pilih tahun ajaran -</option>
              {yearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grade_id">Tingkat</Label>
            <select
              id="grade_id"
              name="grade_id"
              defaultValue={editing?.grade_id ?? ""}
              className={SELECT_CLASS}
              required
            >
              <option value="">- pilih tingkat -</option>
              {levelOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nama Kelas</Label>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Kelas 7A" required={!isEdit} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="major_id">Jurusan (opsional)</Label>
            <select
              id="major_id"
              name="major_id"
              defaultValue={editing?.major_id ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">- tidak ada -</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room_id">Ruangan (opsional)</Label>
            <select
              id="room_id"
              name="room_id"
              defaultValue={editing?.room_id ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">- tidak ada -</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="homeroom_teacher_id">Wali Kelas (opsional)</Label>
            <select
              id="homeroom_teacher_id"
              name="homeroom_teacher_id"
              defaultValue={editing?.homeroom_teacher_id ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">- tidak ada -</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </select>
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
