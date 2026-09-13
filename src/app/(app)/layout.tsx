import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { PendingActivation } from "@/components/pending-activation";
import { SetupNotice } from "@/components/setup-notice";
import { SubscriptionBlocked } from "@/components/subscription-blocked";
import { getCurrentUser, isProfileReady } from "@/lib/auth";
import { APP_NAME, isSupabaseConfigured } from "@/lib/env";
import { MAIN_NAV, PLANNED_MODULES } from "@/lib/nav";
import { can } from "@/lib/rbac";
import { subscriptionProblem } from "@/lib/school";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return <SetupNotice />;
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!isProfileReady(user)) {
    return (
      <PendingActivation
        name={user.profile.full_name || user.email || "Pengguna"}
        email={user.email}
        reason={user.profile.is_active ? "no_school" : "inactive"}
      />
    );
  }

  const problem = subscriptionProblem(user.school);
  if (problem && !user.isSuperAdmin) {
    return <SubscriptionBlocked school={user.school} problem={problem} />;
  }

  const items = MAIN_NAV.filter((item) => {
    if (item.superAdminOnly) return user.isSuperAdmin;
    return (
      !item.permission ||
      can(user.permissions, item.permission, user.isSuperAdmin)
    );
  });

  const planned = PLANNED_MODULES.filter((module) =>
    can(user.permissions, module.permission, user.isSuperAdmin)
  );

  return (
    <AppShell
      appName={APP_NAME}
      schoolName={user.school?.name ?? "Platform"}
      user={{
        name: user.profile.full_name || user.email || "Pengguna",
        email: user.email,
        roles: user.roles.map((role) => role.name),
        isSuperAdmin: user.isSuperAdmin,
      }}
      items={items}
      planned={planned}
    >
      {children}
    </AppShell>
  );
}
