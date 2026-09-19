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
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-[#edf2ee] px-4 lg:h-[76px] lg:px-[18px]">
      <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#185743] font-heading text-sm font-semibold text-white shadow-[0_4px_10px_#18574333] lg:size-[34px]">
        {appName.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate font-heading text-[13px] font-semibold leading-tight text-[#173b32]">
          {appName}
        </p>
        <p className="truncate text-[10px] leading-tight text-[#8a9f95]">
          {schoolName}
        </p>
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
            <p className="px-2.5 pt-[18px] pb-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#a1b1a9]">
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
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[12px] transition-colors",
                      isActive
                        ? "bg-[#e7f2e9] font-semibold text-[#175b43]"
                        : "text-[#698079] hover:bg-[#f0f7f2] hover:text-[#1d664d]"
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
      <Separator className="mb-3 border-[#e5eee8]" />
      <p className="mb-2 text-[10px] font-medium text-[#a1b1a9]">
        Modul berikutnya
      </p>
      <ul className="space-y-2.5">
        {planned.map((module) => (
          <li key={module.title} className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-[#2a483e]">
                {module.title}
              </p>
              <p className="truncate text-[10px] text-[#9aaa9f]">
                {module.description}
              </p>
            </div>
            <Badge className="shrink-0 rounded-[99px] border-0 bg-[#f3f5e9] px-[7px] py-[3px] text-[9px] font-bold text-[#7d8b67]">
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
      <div className="flex-1 overflow-y-auto py-[18px] px-[11px]">
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
      <SheetContent side="left" className="w-[258px] p-0">
        <SidebarNav {...props} />
      </SheetContent>
    </Sheet>
  );
}
