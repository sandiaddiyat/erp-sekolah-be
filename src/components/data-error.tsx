"use client";

import { useRouter } from "next/navigation";
import { CircleAlertIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DataError({
  message = "Gagal memuat data.",
}: {
  message?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="flex-1">
        <p className="text-sm font-medium text-destructive">{message}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Terjadi kendala saat memuat data. Coba muat ulang halaman.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => router.refresh()}>
        <RotateCcwIcon data-icon="inline-start" />
        Muat Ulang
      </Button>
    </div>
  );
}
