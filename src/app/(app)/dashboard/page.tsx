import Link from "next/link";
import {
  ChevronRightIcon,
  CircleHelpIcon,
  MoreHorizontalIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import { DataError } from "@/components/data-error";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PERMISSIONS, MODULE_LABELS, MODULE_ORDER, can } from "@/lib/rbac";

export const metadata = { title: "Dashboard" };

type Tone = "green" | "blue" | "amber";

const TONE_CHIP: Record<Tone, string> = {
  green: "bg-[#e7f5e9] text-[#2b7b5a]",
  blue: "bg-[#e8f2f5] text-[#3a7591]",
  amber: "bg-[#fcf3e3] text-[#a67437]",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [usersResult, rolesResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("roles").select("id", { count: "exact", head: true }),
  ]);

  const countsError = usersResult.error ?? rolesResult.error;

  const permissionsByModule = user.permissions.reduce<Record<string, string[]>>(
    (acc, slug) => {
      const moduleKey = slug.split(".")[0] ?? "lainnya";
      acc[moduleKey] = acc[moduleKey] ?? [];
      acc[moduleKey].push(slug.split(".")[1] ?? slug);
      return acc;
    },
    {}
  );

  const modules = Object.keys(permissionsByModule).sort((a, b) => {
    const indexA = MODULE_ORDER.indexOf(a);
    const indexB = MODULE_ORDER.indexOf(b);
    return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
  });

  const stats: {
    title: string;
    value: string | number;
    description: string;
    icon: typeof UsersIcon;
    tone: Tone;
  }[] = [
    {
      title: "Total User",
      value:
        countsError ||
        !(user.isSuperAdmin || can(user.permissions, PERMISSIONS.usersView, false))
          ? "—"
          : (usersResult.count ?? 0),
      description: "Akun di sekolah Anda",
      icon: UsersIcon,
      tone: "green",
    },
    {
      title: "Total Role",
      value:
        countsError ||
        !(user.isSuperAdmin || can(user.permissions, PERMISSIONS.rolesView, false))
          ? "—"
          : (rolesResult.count ?? 0),
      description: "Role dan hak akses",
      icon: ShieldCheckIcon,
      tone: "blue",
    },
    {
      title: "Role Saya",
      value: user.isSuperAdmin ? "Super Admin" : user.roles.length,
      description: user.isSuperAdmin
        ? "Akses penuh ke seluruh sekolah"
        : user.roles.map((role) => role.name).join(", ") || "Belum ada role",
      icon: UserCogIcon,
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      {countsError ? <DataError message="Gagal memuat data statistik." /> : null}

      {/* ===== Heading ===== */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">
            Ruang Kerja Sekolah
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32] lg:text-3xl">
            Selamat datang,{" "}
            <strong className="font-semibold text-[#2c7c5c]">
              {user.profile.full_name || user.email}
            </strong>
          </h1>
          <p className="mt-2 text-xs text-[#82978d]">
            {user.school
              ? `Anda mengakses data ${user.school.name}.`
              : "Anda mengakses platform sebagai super admin."}
          </p>
        </div>
        <button
          type="button"
          className="hidden h-[35px] items-center gap-2 rounded-[9px] border border-[#d9e8dd] bg-white px-3.5 text-[11px] font-bold text-[#38775d] sm:inline-flex"
        >
          <CircleHelpIcon className="size-4" />
          Pusat Bantuan
        </button>
      </div>

      {/* ===== Statistik ===== */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="relative min-h-[141px] overflow-hidden rounded-[14px] border border-[#e2ece5] bg-white p-5"
            >
              <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold text-[#789087]">
                {stat.title}
                <span
                  className={`grid size-8 place-items-center rounded-[9px] ${TONE_CHIP[stat.tone]}`}
                >
                  <Icon className="size-[17px]" />
                </span>
              </div>
              <strong className="mt-4 block font-heading text-[27px] font-semibold text-[#183c31]">
                {stat.value}
              </strong>
              <p className="mt-1.5 text-[11px] text-[#9aaa9f]">{stat.description}</p>
              <span className="pointer-events-none absolute -right-[22px] -bottom-[46px] size-[105px] rounded-full border border-[#59a3751a] shadow-[0_0_0_18px_#59a3750d,0_0_0_36px_#59a37505]" />
            </div>
          );
        })}
      </div>

      {/* ===== Panel hak akses ===== */}
      <div className="rounded-[15px] border border-[#e2ece5] bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-[#edf2ee] px-6 py-5">
          <div>
            <h2 className="font-heading text-[15px] font-semibold text-[#21483b]">
              Hak Akses Anda
            </h2>
            <p className="mt-1.5 text-[11px] text-[#8b9f95]">
              {user.isSuperAdmin
                ? "Super admin memiliki akses ke seluruh modul."
                : `Terhubung dari ${user.roles.length} role. Modul di bawah ini yang bisa Anda akses.`}
            </p>
          </div>
          <button
            type="button"
            aria-label="Pilihan hak akses"
            className="grid size-7 place-items-center rounded-[7px] border-0 text-[#8aa097]"
          >
            <MoreHorizontalIcon className="size-[19px]" />
          </button>
        </div>

        {user.isSuperAdmin ? (
          <div className="px-6 py-5">
            <span className="inline-flex items-center gap-1 rounded-[5px] bg-[#e7f5e9] px-2 py-1 text-[11px] font-bold text-[#2b7254]">
              <ShieldCheckIcon className="size-4" />
              Akses penuh ke seluruh modul
            </span>
          </div>
        ) : modules.length === 0 ? (
          <div className="px-6 py-5 text-sm text-muted-foreground">
            Belum ada hak akses yang diberikan. Hubungi administrator sekolah.
          </div>
        ) : (
          <div className="grid gap-3 px-6 py-5 sm:grid-cols-2">
            {modules.map((moduleKey) => (
              <div
                key={moduleKey}
                className="min-h-[68px] rounded-[10px] border border-[#e9efeb] bg-[#fcfdfc] p-3"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-[#2a4a3e]">
                  {MODULE_LABELS[moduleKey] ?? moduleKey}
                  <ChevronRightIcon className="size-[15px] text-[#b0c1b8]" />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {permissionsByModule[moduleKey].sort().map((action) => (
                    <span
                      key={action}
                      className="rounded-[5px] bg-[#eef2ef] px-[7px] py-1 text-[9px] font-semibold text-[#70867b]"
                    >
                      {action}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2ee] px-6 py-3.5 text-[10px] text-[#91a49a]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheckIcon className="size-[15px]" />
            Akses diperbarui otomatis dari role Anda
          </span>
          <div className="flex flex-wrap gap-2">
            {can(user.permissions, PERMISSIONS.usersView, user.isSuperAdmin) ? (
              <Link
                href="/users"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33805d] hover:text-[#2b7254]"
              >
                Kelola User
                <ChevronRightIcon className="size-3.5" />
              </Link>
            ) : null}
            {can(user.permissions, PERMISSIONS.rolesView, user.isSuperAdmin) ? (
              <Link
                href="/roles"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33805d] hover:text-[#2b7254]"
              >
                Kelola Role
                <ChevronRightIcon className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}