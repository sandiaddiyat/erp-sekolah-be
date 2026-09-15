"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[auth-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">
        Terjadi Kesalahan
      </h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Gagal memuat halaman autentikasi. Silakan coba lagi.
      </p>
      <Button onClick={() => reset()}>Coba Lagi</Button>
    </div>
  );
}
