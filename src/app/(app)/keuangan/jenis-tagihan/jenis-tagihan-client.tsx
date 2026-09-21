"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BillItem } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { BillItemFormDialog } from "./_components/bill-item-form-dialog";
import { BillItemDeleteDialog } from "./_components/bill-item-delete-dialog";

const FINANCE_PANEL =
  "mb-[23px] rounded-[15px] border border-[#e2ece5] bg-white shadow-[0_3px_7px_#1c443302]";
const FINANCE_HEADING =
  "flex items-start justify-between gap-[15px] border-b border-[#edf2ee] px-[21px] pb-4 pt-5";
const FINANCE_LIST = "px-[21px] pb-[7px]";
const FINANCE_ROW =
  "flex items-center gap-[15px] border-b border-[#f0f5f1] px-[3px] py-[13px] last:border-b-0";

const OUTLINE_BUTTON =
  "h-8 rounded-[9px] border border-[#d7e6dc] bg-white px-2.5 text-[10px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]";
const DELETE_BUTTON =
  "h-[29px] rounded-[7px] border border-[#ecd9d5] bg-white px-[9px] text-[10px] font-bold text-[#b06c63] hover:border-[#dcaea7] hover:bg-[#fff5f3] hover:text-[#b06c63]";

export function JenisTagihanClient({
  billItems,
  canManage,
}: {
  billItems: BillItem[];
  canManage: boolean;
}) {
  const [itemOpen, setItemOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BillItem | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">
            Keuangan
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">
            Jenis Tagihan
          </h1>
          <p className="mt-2 text-xs text-[#82978d]">
            Kelola katalog jenis tagihan yang tersedia di sekolah ini.
          </p>
        </div>
        {canManage ? (
          <Button variant="outline" className={OUTLINE_BUTTON} onClick={() => setItemOpen(true)}>
            <PlusIcon data-icon="inline-start" className="size-3.5" />
            Tambah Jenis
          </Button>
        ) : null}
      </div>

      <section className={FINANCE_PANEL}>
        <div className={FINANCE_HEADING}>
          <div>
            <h2 className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">
              Katalog Jenis Tagihan
            </h2>
            <p className="mt-1.5 text-[11px] text-[#8b9f95]">
              {billItems.length} jenis tagihan terdaftar
            </p>
          </div>
        </div>
        {billItems.length > 0 ? (
          <div className={FINANCE_LIST}>
            {billItems.map((item) => (
              <div key={item.id} className={`${FINANCE_ROW} min-h-[72px]`}>
                <div className="min-w-0 flex-1">
                  <strong className="block text-[12px] text-[#2b493e]">
                    {item.nama_item}
                  </strong>
                  <span className="mt-1 block text-[10px] text-[#7d9389]">
                    {formatRupiah(Number(item.nominal))} · {item.frekuensi}
                  </span>
                </div>
                {canManage ? (
                  <Button
                    variant="outline"
                    className={DELETE_BUTTON}
                    onClick={() => setDeletingItem(item)}
                  >
                    Hapus
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-[21px] pb-[34px] pt-[25px] text-center">
            <p className="text-sm font-semibold text-[#3e5c50]">Belum ada jenis tagihan</p>
            <p className="mt-1 text-xs text-[#a0afa8]">
              {canManage
                ? "Tambah jenis tagihan pertama untuk mulai."
                : "Hubungi admin sekolah untuk mengelola jenis tagihan."}
            </p>
          </div>
        )}
      </section>

      <BillItemFormDialog open={itemOpen} onOpenChange={setItemOpen} />
      <BillItemDeleteDialog
        item={deletingItem}
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      />
    </div>
  );
}
