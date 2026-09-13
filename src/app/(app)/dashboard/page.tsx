import Link from "next/link";
import {
  ArrowRightIcon,
  ShieldCheckIcon,
  UserCogIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataError } from "@/components/data-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PERMISSIONS, MODULE_LABELS, MODULE_ORDER, can } from "@/lib/rbac";

export const metadata = { title: "Dashboard" };

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
      title: "Total User",
      value:
        countsError ||
        !(user.isSuperAdmin || can(user.permissions, PERMISSIONS.usersView, false))
          ? "—"
          : (usersResult.count ?? 0),
      description: "Akun di sekolah Anda",
      icon: UsersIcon,
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
    },
    {
      title: "Role Saya",
      value: user.isSuperAdmin ? "Super Admin" : user.roles.length,
      description: user.isSuperAdmin
        ? "Akses penuh ke seluruh sekolah"
        : user.roles.map((role) => role.name).join(", ") || "Belum ada role",
      icon: UserCogIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {countsError ? <DataError message="Gagal memuat data statistik." /> : null}

      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Selamat datang, {user.profile.full_name || user.email}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.school
            ? `Anda mengakses data ${user.school.name}.`
            : "Anda mengakses platform sebagai super admin."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.title}</CardDescription>
                <stat.icon className="size-4 text-muted-foreground" />
              </div>
              <CardTitle className="font-heading text-2xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hak akses Anda</CardTitle>
          <CardDescription>
            {user.isSuperAdmin
              ? "Super admin memiliki akses ke seluruh modul."
              : `Terhubung dari ${user.roles.length} role. Modul di bawah ini yang bisa Anda akses.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.isSuperAdmin ? (
            <Badge variant="default" className="gap-1">
              <ShieldCheckIcon />
              Akses penuh
            </Badge>
          ) : modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada hak akses yang diberikan. Hubungi administrator sekolah.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {modules.map((moduleKey) => (
                <div
                  key={moduleKey}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="mb-2 text-sm font-medium">
                    {MODULE_LABELS[moduleKey] ?? moduleKey}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {permissionsByModule[moduleKey].sort().map((action) => (
                      <Badge
                        key={action}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {can(user.permissions, PERMISSIONS.usersView, user.isSuperAdmin) ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/users" />}
              >
                Kelola User
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : null}
            {can(user.permissions, PERMISSIONS.rolesView, user.isSuperAdmin) ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/roles" />}
              >
                Kelola Role
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
