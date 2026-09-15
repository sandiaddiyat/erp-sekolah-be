import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">404</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.
      </p>
      <Button render={<Link href="/dashboard" />}>
        Kembali ke Dashboard
      </Button>
    </div>
  );
}
