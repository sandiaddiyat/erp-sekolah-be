"use client";

import { useEffect, useActionState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import type { StudentEnrollment, AcademicYear, Class as SchoolClass } from "@/lib/types";
import { saveEnrollment } from "../actions";

const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

export function EnrollmentFormDialog({
  open,
  onOpenChange,
  pendaftaran,
  studentName,
  academicYears,
  classes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendaftaran: StudentEnrollment | null;
  studentName: (id: string) => string;
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  onSaved: (message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(saveEnrollment, undefined);

  useEffect(() => {
    if (state?.success) {
      onSaved(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange, onSaved]);

  const form = useForm({
    defaultValues: {
      academic_year_id: "",
      class_id: "",
      enrollment_date: "",
      exit_date: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (pendaftaran) {
      form.reset({
        academic_year_id: pendaftaran.academic_year_id,
        class_id: pendaftaran.class_id,
        enrollment_date: pendaftaran.enrollment_date,
        exit_date: pendaftaran.exit_date ?? "",
        status: pendaftaran.status,
      });
    }
  }, [pendaftaran, form]);

  const watchedYear = form.watch("academic_year_id");
  const filteredClasses = watchedYear
    ? classes.filter((c) => c.academic_year_id === watchedYear)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[600px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
              Data Akademik
            </span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Edit Pendaftaran Siswa
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
              {pendaftaran ? studentName(pendaftaran.student_id) : ""}
            </DialogDescription>
          </DialogHeader>

          {pendaftaran ? (
            <>
              <input type="hidden" name="id" value={pendaftaran.id} />
              <input type="hidden" name="student_id" value={pendaftaran.student_id} />
            </>
          ) : null}

          <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="academic_year_id" required>Tahun Ajaran</FieldLabel>
                <select
                  id="academic_year_id"
                  {...form.register("academic_year_id")}
                  required
                  className={SELECT_CLASS}
                >
                  <option value="">- pilih tahun ajaran -</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="class_id" required>Kelas</FieldLabel>
                <select
                  id="class_id"
                  {...form.register("class_id")}
                  required
                  className={SELECT_CLASS}
                >
                  <option value="">- pilih kelas -</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="enrollment_date" required>Tanggal Pendaftaran</FieldLabel>
                <Input
                  id="enrollment_date"
                  type="date"
                  required
                  {...form.register("enrollment_date")}
                  className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="exit_date">Tanggal Keluar</FieldLabel>
                <Input
                  id="exit_date"
                  type="date"
                  {...form.register("exit_date")}
                  className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <FieldLabel htmlFor="status" required>Status</FieldLabel>
                <select
                  id="status"
                  required
                  {...form.register("status")}
                  className={SELECT_CLASS}
                >
                  <option value="active">Aktif</option>
                  <option value="keluar">Keluar</option>
                  <option value="pindah">Pindah</option>
                  <option value="lulus">Lulus</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-[#f0f5f1] bg-[#fdfefd] px-7 py-5">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-[9px] border-[#e1ebe4] px-4 text-[11px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-5 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] transition-colors hover:bg-[#124936]"
            >
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
