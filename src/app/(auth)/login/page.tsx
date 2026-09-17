import Link from "next/link";
import {
  BookOpen,
  ClipboardListIcon,
  GraduationCap,
  ShieldCheckIcon,
  Users,
  WalletIcon,
  Wand2,
} from "lucide-react";
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
  searchParams: Promise<{ next?: string; loggedOut?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/dashboard";
  const notice = params.loggedOut ? "Anda telah keluar." : undefined;

  return (
    <main className="grid min-h-svh bg-[#f7f9f6] lg:grid-cols-[minmax(420px,46%)_1fr] dark:bg-[#0b1512]">
      {/* ===== Panel branding (kiri) ===== */}
      <section
        aria-label="Tentang aplikasi"
        className="relative hidden min-h-svh flex-col justify-between overflow-hidden bg-[#164d40] p-10 text-white lg:flex"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[150px] -right-[80px] size-[330px] rounded-full bg-[#3d9f7b] opacity-30 blur-[2px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[265px] -left-[180px] size-[470px] rounded-full bg-[#3d9f7b] opacity-15 blur-[2px]"
        />

        <Link
          href="/"
          aria-label="Beranda"
          className="relative inline-flex w-fit items-center gap-[11px] font-display text-lg font-bold tracking-tight"
        >
          <span className="grid size-[39px] place-items-center rounded-xl bg-[#d7f0dd] text-[#154d40] shadow-[0_7px_18px_rgb(4_37_29/18%)]">
            <GraduationCap className="size-[22px]" strokeWidth={2.2} />
          </span>
          {APP_NAME}
        </Link>

        <div className="relative my-[55px] max-w-[490px]">
          <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.08em] text-[#aedfc3] uppercase">
            <Wand2 className="size-3.5" /> Ruang kerja sekolah yang lebih baik
          </span>
          <h1 className="mt-5 mb-[17px] font-display text-[clamp(34px,4.25vw,57px)] leading-[1.13] font-bold tracking-[-0.065em]">
            Fokus mendidik,
            <br />
            <em className="text-[#a9dbba]">lebih mudah mengelola.</em>
          </h1>
          <p className="max-w-[410px] text-[15px] leading-[1.7] text-[#c3dbd1]">
            Satu platform sederhana untuk membantu sekolah tumbuh,
            berkolaborasi, dan melayani dengan lebih baik.
          </p>
        </div>

        <ul className="relative grid max-w-[490px] gap-5">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex items-start gap-[13px]">
              <span className="mt-px grid size-[39px] shrink-0 place-items-center rounded-xl border border-[rgb(181_231_198/25%)] bg-[rgb(2_37_28/19%)] text-[#b8e8c8]">
                <item.icon className="size-[19px]" strokeWidth={1.8} />
              </span>
              <div>
                <strong className="mb-1 block text-[13px] font-bold text-[#f4fbf5]">
                  {item.title}
                </strong>
                <span className="block text-xs leading-[1.5] text-[#a8c9bb]">
                  {item.description}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <p className="relative mt-auto flex items-center gap-2 pt-10 text-[11px] text-[#9dc7b3]">
          <ShieldCheckIcon className="size-4" /> Data sekolah Anda aman dan terlindungi
        </p>

        {/* Dekorasi: ring + card melayang (kanan bawah) */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[-15px] bottom-[65px] size-[260px] opacity-75"
        >
          <span className="absolute right-[-80px] bottom-[-100px] size-[270px] rounded-full border border-[rgb(177_232_192/22%)] shadow-[0_0_0_35px_rgb(177_232_192/4%),0_0_0_70px_rgb(177_232_192/3%)]" />
          <span className="absolute right-[110px] bottom-[100px] grid size-[70px] -rotate-10 place-items-center rounded-2xl border border-[rgb(177_232_192/25%)] bg-[rgb(7_55_42/50%)] text-[#b8e8c8] shadow-[0_18px_35px_rgb(2_27_21/18%)] backdrop-blur-[6px]">
            <BookOpen className="size-[30px]" />
          </span>
          <span className="absolute right-[25px] bottom-[35px] grid size-[62px] rotate-9 place-items-center rounded-2xl border border-[rgb(177_232_192/25%)] bg-[rgb(7_55_42/50%)] text-[#b8e8c8] shadow-[0_18px_35px_rgb(2_27_21/18%)] backdrop-blur-[6px]">
            <Users className="size-6" />
          </span>
        </div>
      </section>

      {/* ===== Panel form (kanan) ===== */}
      <section
        aria-label="Form masuk"
        className="grid place-items-center bg-[radial-gradient(circle_at_100%_0%,#e3f1e5_0,#f7f9f6_31%)] p-[30px_22px_26px] lg:bg-none lg:p-8"
      >
        <div className="w-full max-w-[430px]">
          <Link
            href="/"
            aria-label="Beranda"
            className="mb-[73px] inline-flex w-fit items-center gap-[11px] font-display text-lg font-bold tracking-tight text-[#164d40] lg:hidden"
          >
            <span className="grid size-[39px] place-items-center rounded-xl bg-[#d7f0dd] text-[#154d40] shadow-[0_7px_18px_rgb(4_37_29/18%)]">
              <GraduationCap className="size-[22px]" strokeWidth={2.2} />
            </span>
            {APP_NAME}
          </Link>

          <div>
            <span className="text-xs font-bold tracking-[0.08em] text-[#66847a] uppercase dark:text-[#7d938a]">
              Selamat datang kembali
            </span>
            <h2 className="mt-[13px] mb-2 font-display text-[clamp(28px,3vw,37px)] leading-[1.15] font-bold tracking-[-0.055em] text-[#173b32] dark:text-[#e8f0ec]">
              Masuk ke akun Anda
            </h2>
            <p className="text-sm leading-[1.55] text-[#779187] dark:text-[#8fa39a]">
              Gunakan email dan password yang diberikan administrator sekolah.
            </p>
          </div>

          <LoginForm next={next} notice={notice} />

          <p className="mt-[29px] text-center text-xs text-[#82968e] dark:text-[#6b7f76]">
            Belum memiliki akses?{" "}
            <span className="font-bold text-[#1f795b]">Hubungi administrator sekolah</span>
          </p>
          <p className="mt-[67px] text-center text-[10px] text-[#a8b8b1] dark:text-[#5c6f66]">
            © 2026 {APP_NAME} · Dibuat untuk pendidikan Indonesia
          </p>
        </div>
      </section>
    </main>
  );
}
