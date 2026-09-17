import { ChevronRight, CircleHelp, ShieldCheck, Users, UserCog } from "lucide-react";
import { DataError } from "@/components/data-error";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PERMISSIONS, MODULE_LABELS, MODULE_ORDER, can } from "@/lib/rbac";

export const metadata = { title: "Dashboard" };

type StatCardTone = "green" | "blue" | "amber";

const STAT_TONES: Record<
  StatCardTone,
  { iconBg: string; iconRing: string }
> = {
  green: {
    iconBg: "bg-[#e7f5e9] dark:bg-[#162620]",
    iconRing: "ring-[#e7f5e9]/60 dark:ring-[#162620]/60",
  },
  blue: {
    iconBg: "bg-[#e8f2f5] dark:bg-[#142026]",
    iconRing: "ring-[#e8f2f5]/60 dark:ring-[#142026]/60",
  },
  amber: {
    iconBg: "bg-[#fcf3e3] dark:bg-[#262014]",
    iconRing: "ring-[#fcf3e3]/60 dark:ring-[#262014]/60",
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  detail: string;
  tone: StatCardTone;
}) {
  const tones = STAT_TONES[tone];
  return (
    <article className="group relative min-h-[141px] overflow-hidden rounded-2xl border border-[#e2ece5] bg-white p-5 shadow-[0_3px_7px_rgb(28_68_51/2%)] transition-shadow hover:shadow-[0_8px_20px_rgb(28_68_51/6%)] dark:border-[#22332c] dark:bg-[#0f1f1a]">
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[#789087] dark:text-[#8fa39a]">
          {label}
        </span>
        <span
          className={`grid size-[30px] place-items-center rounded-lg ${tones.iconBg} ${tones.iconRing} ring-4`}
        >
          <Icon className="size-[17px] text-current" />
        </span>
      </div>
      <strong className="relative mt-[15px] block font-display text-[27px] font-bold tracking-[-0.06em] text-[#183c31] dark:text-[#e8f0ec]">
        {value}
      </strong>
      <p className="relative mt-[5px] text-[11px] text-[#9aaa9f] dark:text-[#6b7f76]">
        {detail}
      </p>
      <span
        aria-hidden
        className="pointer-events-none absolute -right-[22px] -bottom-[46px] size-[105px] rounded-full border border-[rgb(89_163_117/10%)] shadow-[0_0_0_18px_rgb(89_163_117/3%),0_0_0_36px_rgb(89_163_117/2%)] dark:border-[rgb(184_232_200/12%)]"
      />
    </article>
  );
}

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

  const stats = [
    {
      icon: Users,
      label: "Total User",
      value:
        countsError ||
        !(user.isSuperAdmin || can(user.permissions, PERMISSIONS.usersView, false))
          ? "—"
          : (usersResult.count ?? 0),
      detail: "Akun di sekolah Anda",
      tone: "green" as const,
    },
    {
      icon: ShieldCheck,
      label: "Total Role",
      value:
        countsError ||
        !(user.isSuperAdmin || can(user.permissions, PERMISSIONS.rolesView, false))
          ? "—"
          : (rolesResult.count ?? 0),
      detail: "Role dan hak akses",
      tone: "blue" as const,
    },
    {
      icon: UserCog,
      label: "Role Saya",
      value: user.isSuperAdmin ? "Super Admin" : user.roles.length,
      detail: user.isSuperAdmin
        ? "Akses penuh ke seluruh sekolah"
        : user.roles.map((role) => role.name).join(", ") || "Belum ada role",
      tone: "amber" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[1350px] space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c9a77] dark:text-[#6b9c82]">
            Ruang kerja sekolah
          </span>
          <h1 className="mt-2.5 font-display text-[clamp(23px,2.4vw,31px)] font-bold leading-[1.2] tracking-[-0.06em] text-[#183d32] dark:text-[#e8f0ec]">
            Selamat datang,{" "}
            <strong className="text-[#2c7c5c] dark:text-[#a9dbba]">
              {user.profile.full_name || user.email}
            </strong>
          </h1>
          <p className="mt-2 text-[12px] text-[#82978d] dark:text-[#6b7f76]">
            {user.school
              ? `Anda mengakses data ${user.school.name}.`
              : "Anda mengakses platform sebagai super admin."}
          </p>
        </div>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[#d9e8dd] bg-white px-3 text-[11px] font-bold text-[#38775d] transition-colors hover:border-[#a8cfb3] hover:bg-[#f3faf4] dark:border-[#22332c] dark:bg-[#0f1f1a] dark:text-[#8fc4a8] dark:hover:border-[#3a5c4c] dark:hover:bg-[#162620]"
        >
          <CircleHelp className="size-4" />
          Pusat bantuan
        </button>
      </div>

      {countsError ? (
        <DataError message="Gagal memuat data statistik." />
      ) : null}

      <section
        aria-label="Ringkasan sekolah"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e2ece5] bg-white shadow-[0_3px_7px_rgb(28_68_51/2%)] dark:border-[#22332c] dark:bg-[#0f1f1a]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#edf2ee] px-5 py-5 dark:border-[#22332c]">
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-[-0.035em] text-[#21483b] dark:text-[#d9e8dd]">
              Hak akses Anda
            </h2>
            <p className="mt-1.5 text-[11px] text-[#8b9f95] dark:text-[#6b7f76]">
              {user.isSuperAdmin
                ? "Super admin memiliki akses ke seluruh modul."
                : `Terhubung dari ${user.roles.length} role. Modul di bawah ini yang bisa Anda akses.`}
            </p>
          </div>
        </div>

        <div className="px-5 py-5">
          {user.isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/20">
              <ShieldCheck className="size-3.5" />
              Akses penuh
            </span>
          ) : modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada hak akses yang diberikan. Hubungi administrator sekolah.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((moduleKey) => (
                <article
                  key={moduleKey}
                  className="min-h-[68px] rounded-xl border border-[#e9efeb] bg-[#fcfdfc] p-3 transition-all hover:-translate-y-0.5 hover:border-[#bddac4] hover:shadow-[0_5px_12px_rgb(34_90_62/5%)] dark:border-[#22332c] dark:bg-[#11221a] dark:hover:border-[#3a5c4c]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#2a4a3e] dark:text-[#c3dbd1]">
                      {MODULE_LABELS[moduleKey] ?? moduleKey}
                    </span>
                    <ChevronRight className="size-[15px] text-[#b0c1b8] dark:text-[#5c6f66]" />
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {permissionsByModule[moduleKey].sort().map((action) => (
                      <span
                        key={action}
                        className="rounded bg-[#eef2ef] px-1.5 py-0.5 text-[9px] font-semibold text-[#70867b] dark:bg-[#1a2e25] dark:text-[#8fa39a]"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#edf2ee] px-5 py-3.5 dark:border-[#22332c]">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#91a49a] dark:text-[#5c6f66]">
            <ShieldCheck className="size-[15px] text-[#5d9c76] dark:text-[#8fc4a8]" />
            Akses diperbarui otomatis dari role Anda
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#33805d] hover:underline dark:text-[#8fc4a8]"
          >
            Lihat detail akses
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
