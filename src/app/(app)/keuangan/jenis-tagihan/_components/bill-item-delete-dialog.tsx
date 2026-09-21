"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteBillItem } from "../actions";

export function BillItemDeleteDialog({
  item,
  open,
  onOpenChange,
}: {
  item: { id: string; nama_item: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!item) return;
    const target = item;
    startTransition(async () => {
      const result = await deleteBillItem(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      onOpenChange(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus jenis tagihan ini?</AlertDialogTitle>
          <AlertDialogDescription>
            {item?.nama_item} akan dihapus dari katalog. Tagihan yang
            sudah dibuat tidak ikut terhapus.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
