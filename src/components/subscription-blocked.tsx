import { CalendarXIcon, BanIcon, SchoolIcon } from "lucide-react";
import { signOut } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatActiveUntil, type SubscriptionProblem } from "@/lib/school";
import type { School } from "@/lib/types";

export function SubscriptionBlocked({
  school,
  problem,
}: {
  school: School | null;
  problem: Exclude<SubscriptionProblem, null>;
}) {
  const isSuspended = problem === "suspended";

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <div
            className={
              isSuspended
                ? "mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10"
                : "mb-2 flex size-10 items-center justify-center rounded-lg bg-amber-500/10"
            }
          >
            {isSuspended ? (
              <BanIcon className="size-5 text-destructive" />
            ) : (
              <CalendarXIcon className="size-5 text-amber-600" />
            )}
          </div>
          <CardTitle>
            {isSuspended ? "Akun sekolah disuspend" : "Masa aktif telah berakhir"}
          </CardTitle>
          <CardDescription>
            {isSuspended
              ? "Akses ke aplikasi untuk sekolah ini sedang dihentikan sementara."
              : "Masa aktif langganan sekolah ini sudah lewat, sehingga akses ke aplikasi ditutup sementara."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 rounded-lg bg-muted p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              <SchoolIcon className="size-4 text-muted-foreground" />
              {school?.name ?? "Sekolah"}
            </p>
            <p className="text-muted-foreground">
              Masa aktif sampai: {formatActiveUntil(school?.active_until ?? null)}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Hubungi pengelola aplikasi untuk memperpanjang masa aktif. Seluruh
            data sekolah tetap tersimpan dan akan bisa diakses kembali setelah
            masa aktif diperbarui.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="w-full">
              Keluar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
