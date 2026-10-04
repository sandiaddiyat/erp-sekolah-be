"use client";

import { useEffect, useActionState } from "react";
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
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import type { AcademicYear } from "@/lib/types";
import { generateAutomaticPlacement } from "../actions";

export function AutoPlacementDialog({
  open,
  onOpenChange,
  academicYears,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYears: AcademicYear[];
  onSaved: (message: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(generateAutomaticPlacement, undefined);

  useEffect(() => {
    if (state?.success) {
      onSaved(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[450px] rounded-[17px] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)]">
        <form action={formAction} className="flex h-full flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
              Akademik
            </span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Penempatan Otomatis
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
              Siswa aktif yang belum memiliki kelas di tahun ajaran yang dipilih akan ditempatkan secara acak (round-robin) ke seluruh kelas yang ada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 px-7 pt-[22px] pb-[25px]">
            <div className="space-y-2">
              <FieldLabel htmlFor="auto_academic_year_id" required>Tahun Ajaran Target</FieldLabel>
              <select
                id="auto_academic_year_id"
                name="academic_year_id"
                required
                className="h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              >
                <option value="">- pilih tahun ajaran -</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
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
              Mulai Penempatan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
