"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReceiptButton() {
  return <Button type="button" onClick={() => window.print()} className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white hover:bg-[#124936]"><PrinterIcon className="mr-2 size-4" />Cetak Kuitansi</Button>;
}
