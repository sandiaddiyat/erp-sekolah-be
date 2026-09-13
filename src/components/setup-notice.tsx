import { DatabaseIcon, KeyRoundIcon, TerminalIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
        {number}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
      {children}
    </pre>
  );
}

export function SetupNotice() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-3xl items-center p-4">
      <Card className="w-full">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <DatabaseIcon className="size-5 text-primary" />
          </div>
          <CardTitle>Supabase belum dikonfigurasi</CardTitle>
          <CardDescription>
            Aplikasi berjalan, tetapi belum terhubung ke database. Ikuti 3
            langkah berikut untuk mengaktifkan login dan manajemen user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Step number={1} title="Buat project Supabase (gratis)">
            <p>
              Daftar di supabase.com, buat project baru, lalu buka{" "}
              <span className="font-medium text-foreground">
                Project Settings → API
              </span>{" "}
              dan salin tiga nilai berikut.
            </p>
          </Step>

          <Step number={2} title="Isi file .env.local">
            <p>
              Salin <code className="font-mono text-xs">.env.example</code>{" "}
              menjadi <code className="font-mono text-xs">.env.local</code>, lalu
              isi:
            </p>
            <Code>
              {`NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...`}
            </Code>
            <p className="flex items-start gap-1.5 text-xs">
              <KeyRoundIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-medium text-foreground">
                  service_role key bersifat rahasia
                </span>{" "}
                — hanya untuk server. Jangan pernah commit atau taruh di kode
                frontend.
              </span>
            </p>
          </Step>

          <Step number={3} title="Jalankan SQL dan restart server">
            <p>
              Buka{" "}
              <span className="font-medium text-foreground">
                SQL Editor
              </span>{" "}
              di Supabase, lalu jalankan secara berurutan:
            </p>
            <Code>{`supabase/migrations/0001_init_rbac.sql
supabase/migrations/0002_seed_rbac.sql
supabase/bootstrap.sql   (ganti email admin di dalamnya)`}</Code>
            <p>
              Buat dulu 1 user di{" "}
              <span className="font-medium text-foreground">
                Authentication → Users → Add user
              </span>{" "}
              sebelum menjalankan <code className="font-mono text-xs">bootstrap.sql</code>.
              Setelah itu jalankan{" "}
              <code className="flex items-center gap-1.5 font-mono text-xs">
                <TerminalIcon className="size-3.5" /> npm run dev
              </code>{" "}
              lagi.
            </p>
          </Step>
        </CardContent>
      </Card>
    </div>
  );
}
