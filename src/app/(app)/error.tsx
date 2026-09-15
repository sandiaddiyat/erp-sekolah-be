"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="text-xl font-semibold">
        Terjadi Kesalahan
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Maaf, terjadi kesalahan saat memuat halaman ini. Silakan coba lagi atau
        hubungi administrator jika masalah berlanjut.
      </p>
      <Button onClick={() => reset()}>Coba Lagi</Button>
    </div>
  );
}
