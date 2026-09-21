"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/types";
import { saveBillItem } from "../actions";

const MODAL_CONTENT =
  "max-h-[92vh] gap-0 overflow-hidden rounded-[17px] border-[#dbe8df] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_#0d322238] sm:max-w-[650px]";
const MODAL_HEADER =
  "flex items-start justify-between gap-5 border-b border-[#e5eee8] bg-white px-6 pb-[18px] pt-[22px]";
const MODAL_BODY = "max-h-[60vh] space-y-4 overflow-y-auto px-6 py-[22px]";
const MODAL_FOOTER =
  "flex items-center justify-end gap-2 border-t border-[#e3ece6] bg-white px-6 py-[14px]";

const INPUT_CLASS =
  "h-10 rounded-[9px] border-[#dfeae3] text-[11px] text-[#36584a] focus-visible:border-[#78ad8a] focus-visible:ring-[#4f9970]/10";
const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus-visible:border-[#78ad8a] focus-visible:ring-[#4f9970]/10 dark:bg-input/30";
const LABEL_CLASS = "text-[10px] font-bold text-[#4c6a5e]";

const PRIMARY_BUTTON =
  "h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]";

export function BillItemFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveBillItem,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CONTENT}>
        <form action={formAction}>
          <div className={MODAL_HEADER}>
            <DialogTitle className="font-heading text-[20px] tracking-[-0.05em] text-[#183d32]">
              Tambah Jenis Tagihan
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[11px] leading-relaxed text-[#83988e]">
              Katalog jenis tagihan yang bisa dipilih saat membuat tagihan.
            </DialogDescription>
          </div>

          <div className={MODAL_BODY}>
            <div className="space-y-2">
              <Label htmlFor="nama_item" className={LABEL_CLASS}>
                Nama Jenis
              </Label>
              <Input
                id="nama_item"
                name="nama_item"
                placeholder="Contoh: SPP Bulanan"
                className={INPUT_CLASS}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item_nominal" className={LABEL_CLASS}>
                  Nominal (Rp)
                </Label>
                <Input
                  id="item_nominal"
                  name="nominal"
                  placeholder="150000"
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frekuensi" className={LABEL_CLASS}>
                  Frekuensi
                </Label>
                <select
                  id="frekuensi"
                  name="frekuensi"
                  required
                  defaultValue="bulanan"
                  className={SELECT_CLASS}
                >
                  <option value="sekali">Sekali</option>
                  <option value="bulanan">Bulanan</option>
                  <option value="tahunan">Tahunan</option>
                </select>
              </div>
            </div>
          </div>

          <div className={MODAL_FOOTER}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
              <PlusIcon className="size-3.5" />
              {isSubmitting ? "Menyimpan..." : "Tambah Jenis"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
