import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Tidak Berhak" };

export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg items-center py-10">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-destructive/10">
            <ShieldAlertIcon className="size-5 text-destructive" />
          </div>
          <CardTitle>Akses ditolak</CardTitle>
          <CardDescription>
            Role Anda tidak memiliki izin untuk membuka halaman ini. Hubungi
            administrator sekolah jika menurut Anda ini sebuah kesalahan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/dashboard" />}>
            Kembali ke Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
