"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SchoolIcon } from "lucide-react";
import {
  SCHOOL_STATUS_LABELS,
  daysUntilActiveEnd,
  formatActiveUntil,
  subscriptionProblem,
} from "@/lib/school";
import type { SchoolWithCounts } from "@/lib/types";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[.04em] text-[#8b9f95]">
        {label}
      </dt>
      <dd
        className="mt-1 truncate text-xs text-[#2b493e]"
        title={typeof value === "string" ? value : undefined}
      >
        {value || "-"}
      </dd>
    </div>
  );
}

const STATUS_CLASS: Record<string, string> = {
  active: "rounded-[99px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254]",
  trial: "rounded-[99px] border-transparent bg-[#fcf3e3] px-[8px] py-[4px] text-[9px] font-bold text-[#a67437]",
  suspended: "rounded-[99px] border-transparent bg-[#fdf0ee] px-[8px] py-[4px] text-[9px] font-bold text-[#ad685d]",
};

export function SchoolDetailDialog({
  school,
  onClose,
}: {
  school: SchoolWithCounts | null;
  onClose: () => void;
}) {
  if (!school) return null;

  const problem = subscriptionProblem(school);
  const days = daysUntilActiveEnd(school);

  return (
    <Dialog open={Boolean(school)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[760px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
            Profil Sekolah
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail Sekolah
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan informasi profil sekolah.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]">
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-[14px] bg-[#def1e2]">
              <SchoolIcon className="size-8 text-[#2b7254]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#2b493e]">
                {school.name}
              </p>
              <p className="truncate text-xs text-[#9aaa9f]">{school.slug}</p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-1.5">
            <Badge
              className={
                STATUS_CLASS[school.status] ?? STATUS_CLASS.trial
              }
            >
              {SCHOOL_STATUS_LABELS[school.status]}
            </Badge>
            {problem === "expired" ? (
              <span className="text-xs text-[#ad685d]">Masa aktif sudah lewat</span>
            ) : days !== null && days >= 0 && days <= 30 ? (
              <span className="text-xs text-[#a67437]">Tersisa {days} hari</span>
            ) : null}
          </div>

          <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
            Identitas Sekolah
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <DetailRow label="Nama Sekolah" value={school.name} />
            <DetailRow label="Slug" value={school.slug} />
            <DetailRow label="Jenjang" value={school.level} />
            <DetailRow label="NPSN" value={school.npsn} />
            <DetailRow label="Email Sekolah" value={school.email} />
            <DetailRow label="Telepon" value={school.phone} />
            <DetailRow label="Masa Aktif Sampai" value={formatActiveUntil(school.active_until)} />
            <DetailRow label="Status" value={SCHOOL_STATUS_LABELS[school.status]} />
          </dl>

          <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
            Alamat
          </h3>
          <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4">
            <DetailRow label="Alamat" value={school.address} />
          </dl>

          <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
            Statistik
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <DetailRow label="Jumlah User" value={school.user_count} />
            <DetailRow label="Jumlah Role" value={school.role_count} />
          </dl>

          {school.notes ? (
            <>
              <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
                Catatan
              </h3>
              <p className="mt-3 text-xs text-[#3e5c50]">{school.notes}</p>
            </>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
