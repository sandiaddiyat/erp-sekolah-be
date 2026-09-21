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
import type { StudentEnrollment, AcademicYear, Class as SchoolClass, Siswa } from "@/lib/types";
import { saveEnrollment, deleteEnrollment } from "../actions";

type FormState = { error?: string; success?: string } | undefined;

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30";

const STATUS_LABELS: Record<StudentEnrollment["status"], string> = {
  active: "Aktif",
  keluar: "Keluar",
  pindah: "Pindah",
  lulus: "Lulus",
};

const STATUS_COLORS: Record<StudentEnrollment["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-700",
  keluar: "bg-gray-500/10 text-gray-700",
  pindah: "bg-blue-500/10 text-blue-700",
  lulus: "bg-purple-500/10 text-purple-700",
};

export function PendaftaranClient({
  enrollments,
  academicYears,
  classes,
  students,
  canManage,
}: {
  enrollments: StudentEnrollment[];
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  students: Siswa[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentEnrollment | null>(null);
  const [deleting, setDeleting] = useState<StudentEnrollment | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = enrollments.filter((e) =>
    (students.find((s) => s.id === e.student_id)?.nama_lengkap ?? e.student_id)
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const yearOptions = academicYears.map((y) => ({ value: y.id, label: y.name }));
  const classOptions = classes.map((c) => ({ value: c.id, label: c.name }));
  const studentOptions = students.map((s) => ({ value: s.id, label: s.nama_lengkap }));

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteEnrollment(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Pendaftaran Siswa</h1>
          <p className="text-sm text-muted-foreground">
            Daftarkan siswa ke tahun ajaran dan kelas yang sesuai.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Tambah Pendaftaran
          </Button>
        ) : null}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari siswa..." className="pl-8" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Pendaftaran</CardTitle>
          <CardDescription>{filtered.length} dari {enrollments.length} pendaftaran</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada pendaftaran</p>
              <p className="text-sm text-muted-foreground mt-1">Tambahkan pendaftaran siswa pertama.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const student = students.find((s) => s.id === item.student_id);
                const className = classes.find((c) => c.id === item.class_id)?.name;
                const yearName = academicYears.find((y) => y.id === item.academic_year_id)?.name;
                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{student?.nama_lengkap ?? item.student_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {yearName ?? item.academic_year_id} · {className ?? item.class_id}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.enrollment_date?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditing(item); setFormOpen(true); }}>Ubah</Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleting(item)}>Hapus</Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <>
          <FormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} studentOptions={studentOptions} yearOptions={yearOptions} classOptions={classOptions} />

          <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus pendaftaran ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Pendaftaran akan dihapus permanen. Data lain yang membutuhkan pendaftaran ini tidak akan terpengaruh.
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
  studentOptions,
  yearOptions,
  classOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StudentEnrollment | null;
  studentOptions: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  classOptions: { value: string; label: string }[];
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveEnrollment, undefined);

  useEffect(() => {
    if (state?.success) { toast.success(state.success); onOpenChange(false); }
    else if (state?.error) toast.error(state.error);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Pendaftaran" : "Tambah Pendaftaran"}</DialogTitle>
            <DialogDescription>
              {editing ? "Perbarui data pendaftaran siswa." : "Tambahkan siswa ke kelas dan tahun ajaran."}
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <Label htmlFor="student_id">Siswa</Label>
            <select
              id="student_id"
              name="student_id"
              defaultValue={editing?.student_id ?? ""}
              className={SELECT_CLASS}
              required
            >
              <option value="">- pilih siswa -</option>
              {studentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

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
            <Label htmlFor="class_id">Kelas</Label>
            <select
              id="class_id"
              name="class_id"
              defaultValue={editing?.class_id ?? ""}
              className={SELECT_CLASS}
              required
            >
              <option value="">- pilih kelas -</option>
              {classOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="enrollment_date">Tanggal Pendaftaran</Label>
              <Input id="enrollment_date" name="enrollment_date" type="date" defaultValue={editing?.enrollment_date?.slice(0, 10) ?? ""} required={!isEdit} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exit_date">Tanggal Keluar (opsional)</Label>
              <Input id="exit_date" name="exit_date" type="date" defaultValue={editing?.exit_date?.slice(0, 10) ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={editing?.status ?? "active"}
              className={SELECT_CLASS}
              required
            >
              <option value="active">Aktif</option>
              <option value="keluar">Keluar</option>
              <option value="pindah">Pindah</option>
              <option value="lulus">Lulus</option>
            </select>
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
