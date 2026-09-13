import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut } from "@/app/auth-actions";

export function PendingActivation({
  name,
  email,
  reason,
}: {
  name: string;
  email: string | null;
  reason: "inactive" | "no_school";
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-lg items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
            <ClockIcon className="size-5 text-amber-600" />
          </div>
          <CardTitle>Akun menunggu aktivasi</CardTitle>
          <CardDescription>
            {reason === "inactive"
              ? "Akun kamu sedang dinonaktifkan oleh administrator sekolah."
              : "Akun kamu belum dihubungkan ke sekolah mana pun."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">{name}</p>
            {email ? (
              <p className="text-muted-foreground">{email}</p>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Hubungi administrator sekolah untuk mengaktifkan akun dan memberikan
            role. Setelah diaktifkan, silakan login ulang.
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
