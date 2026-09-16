"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DatabaseIcon,
  GraduationCapIcon,
  IdCardIcon,
  LayoutDashboardIcon,
  MenuIcon,
  SchoolIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, type NavIcon, type NavItem, type PlannedModule } from "@/lib/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  users: UsersIcon,
  shield: ShieldCheckIcon,
  school: SchoolIcon,
  pegawai: IdCardIcon,
  siswa: GraduationCapIcon,
  master: DatabaseIcon,
  keuangan: WalletIcon,
};

type SidebarNavProps = {
  items: NavItem[];
  planned: PlannedModule[];
  appName: string;
  schoolName: string;
};

function Brand({ appName, schoolName }: { appName: string; schoolName: string }) {
  return (
    <div className="flex items-center gap-2.5 p-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-sm font-semibold text-primary-foreground">
        {appName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate font-heading text-sm font-medium">{appName}</p>
        <p className="truncate text-xs text-muted-foreground">{schoolName}</p>
      </div>
    </div>
  );
}

function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav>
      {NAV_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.group === group.key);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.key}>
            <p className="px-2.5 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            <div className="space-y-1">
              {groupItems.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function PlannedModules({ planned }: { planned: PlannedModule[] }) {
  if (planned.length === 0) return null;

  return (
    <div className="px-4 pb-4">
      <Separator className="mb-3" />
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Modul berikutnya
      </p>
      <ul className="space-y-2.5">
        {planned.map((module) => (
          <li key={module.title} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{module.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {module.description}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 text-[10px]">
              Soon
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SidebarNav({ items, planned, appName, schoolName }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <Brand appName={appName} schoolName={schoolName} />
      <Separator />
      <div className="flex-1 overflow-y-auto py-3">
        <NavLinks items={items} />
      </div>
      <PlannedModules planned={planned} />
    </div>
  );
}

export function MobileNav(props: SidebarNavProps) {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" />}
      >
        <MenuIcon />
        <span className="sr-only">Buka menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        <SidebarNav {...props} />
      </SheetContent>
    </Sheet>
  );
}
