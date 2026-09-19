import { MobileNav, SidebarNav } from "@/components/app-shell/sidebar-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import type { NavItem, PlannedModule } from "@/lib/nav";

type AppShellProps = {
  children: React.ReactNode;
  appName: string;
  schoolName: string;
  user: {
    name: string;
    email: string | null;
    roles: string[];
    isSuperAdmin: boolean;
  };
  items: NavItem[];
  planned: PlannedModule[];
};

export function AppShell({
  children,
  appName,
  schoolName,
  user,
  items,
  planned,
}: AppShellProps) {
  const navProps = { items, planned, appName, schoolName };

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-[#e5eee8] bg-white lg:block">
        <div className="sticky top-0 h-svh">
          <SidebarNav {...navProps} />
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[#e5eee8] bg-white/95 px-3 backdrop-blur lg:px-4">
          <MobileNav {...navProps} />
          <div className="flex-1" />
          <UserMenu {...user} />
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
