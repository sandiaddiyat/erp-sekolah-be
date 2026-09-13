import {
  ClipboardListIcon,
  ShieldCheckIcon,
  WalletIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SetupNotice } from "@/components/setup-notice";
import { APP_NAME, isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata = { title: "Masuk" };

const HIGHLIGHTS = [
  {
    icon: WalletIcon,
    title: "Keuangan & SPP",
    description: "Tagihan, pembayaran, dan tunggakan dalam satu tempat.",
  },
  {
    icon: ClipboardListIcon,
    title: "Administrasi",
    description: "Data siswa, guru, kelas, dan absensi.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Hak akses berjenjang",
    description: "Kepala sekolah, TU, dan bendahara punya akses berbeda.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary-foreground/15 font-heading text-sm font-semibold">
            E
          </div>
          <span className="font-heading font-medium">{APP_NAME}</span>
        </div>

        <div className="space-y-6">
          <h1 className="font-heading text-3xl leading-tight font-semibold">
            Administrasi sekolah yang rapi,
            <br />
            tanpa biaya besar.
          </h1>
          <ul className="space-y-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <item.icon className="mt-0.5 size-5 shrink-0 opacity-80" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-sm opacity-80">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs opacity-70">
          Dibuat untuk sekolah swasta dan pesantren dengan anggaran terbatas.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <div className="mb-4 flex items-center gap-2 lg:hidden">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground">
                E
              </div>
              <span className="font-heading font-medium">{APP_NAME}</span>
            </div>
            <h1 className="font-heading text-xl font-semibold">
              Masuk ke akun Anda
            </h1>
            <p className="text-sm text-muted-foreground">
              Gunakan email dan password yang diberikan administrator sekolah.
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
