"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, GraduationCap, Menu, PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { NavItem, PlannedModule } from "@/lib/nav";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { UserMenu } from "./user-menu";

const ICON_MAP: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  users: Users,
  shield: ShieldCheck,
  school: GraduationCap,
  pegawai: IdCard,
  siswa: GraduationCap,
  master: Database,
  keuangan: Wallet,
};

function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ShieldCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IdCard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 8h.01" />
      <path d="M11 8h6" />
      <path d="M7 12h.01" />
      <path d="M11 12h6" />
      <circle cx="8.5" cy="16.5" r="1.5" />
      <path d="M12 16h4" />
    </svg>
  );
}

function Database({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function Wallet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
      <path d="M21 12h-4a2 2 0 1 0 0 4h4" />
    </svg>
  );
}

function Brand({ name, collapsed }: { name: string; collapsed?: boolean }) {
  return (
    <Link href="/" className={collapsed ? "grid place-items-center" : "flex items-center gap-2.5"}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#185743] text-white shadow-[0_4px_10px_rgb(4_37_29/18%)] dark:bg-[#d7f0dd] dark:text-[#154d40]">
        <GraduationCap className="size-[19px]" />
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <strong className="block truncate font-display text-sm font-bold tracking-[-0.03em] text-[#173b32] dark:text-[#e8f0ec]">
            {name}
          </strong>
          <span className="block truncate text-[10px] text-[#8a9f95] dark:text-[#6b7f76]">
            {name}
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function NavLinks({
  items,
  onNavigate,
  collapsed,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <nav aria-label="Navigasi utama">
      {NAV_GROUPS.map((group) => {
        const groupItems = items.filter((item) => item.group === group.key);
        if (groupItems.length === 0) return null;
        return (
          <div key={group.key} className="mb-5">
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-[#e5eee8] dark:bg-[#22332c]" />
            ) : (
              <span className="block px-2.5 pb-2 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a1b1a9] dark:text-[#5c6f66]">
                {group.label}
              </span>
            )}
            <div className={collapsed ? "flex flex-col items-center space-y-1" : "space-y-0.5"}>
              {groupItems.map((item) => {
                const Icon = ICON_MAP[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={item.title}
                    className={cn(
                      collapsed
                        ? "grid h-9 w-9 place-items-center rounded-lg text-[#698079] transition-colors hover:bg-[#f0f7f2] hover:text-[#1d664d] dark:text-[#8fa39a] dark:hover:bg-[#162620] dark:hover:text-[#b8e8c8]"
                        : "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-[#698079] transition-colors hover:bg-[#f0f7f2] hover:text-[#1d664d] dark:text-[#8fa39a] dark:hover:bg-[#162620] dark:hover:text-[#b8e8c8]"
                    )}
                  >
                    <Icon className="size-[17px] shrink-0" />
                    {!collapsed ? <span className="truncate">{item.title}</span> : null}
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

function UpcomingModules({ planned }: { planned: PlannedModule[] }) {
  if (planned.length === 0) return null;
  return (
    <div className="mt-auto border-t border-[#e5eee8] px-4 pt-4 pb-5 dark:border-[#22332c]">
      <span className="block px-0.5 pb-2.5 text-[10px] font-bold uppercase tracking-[0.04em] text-[#a1b1a9] dark:text-[#5c6f66]">
        Modul berikutnya
      </span>
      <div className="space-y-2">
        {planned.map((module) => (
          <div key={module.title} className="flex items-start justify-between gap-1.5 rounded-lg px-1 py-1">
            <div className="min-w-0">
              <strong className="block truncate text-[11px] font-bold text-[#2a483e] dark:text-[#c3dbd1]">
                {module.title}
              </strong>
              <small className="block truncate text-[10px] text-[#9aaa9f] dark:text-[#6b7f76]">
                {module.description}
              </small>
            </div>
            <span className="shrink-0 rounded-full bg-[#f3f5e9] px-1.5 py-0.5 text-[9px] font-bold not-italic text-[#7d8b67] dark:bg-[#2a332c] dark:text-[#9aaa8f]">
              Soon
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  user,
  items,
  planned,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = () => setCollapsed((value) => !value);

  return (
    <div
      className={cn(
        "min-h-svh bg-[#f6f9f7] lg:grid dark:bg-[#0b1512]",
        collapsed ? "lg:grid-cols-[4.5rem_1fr]" : "lg:grid-cols-[16rem_1fr]"
      )}
    >
      <aside className="hidden border-r border-[#e5eee8] bg-white lg:block dark:border-[#22332c] dark:bg-[#0f1f1a]">
        <div className="sticky top-0 h-svh">
          <div className="flex h-full flex-col">
            <div className="flex min-h-[72px] items-center justify-between border-b border-[#edf2ee] px-4 py-4 dark:border-[#22332c]">
              <Brand name={appName} collapsed={collapsed} />
            </div>
            <div className="flex-1 overflow-y-auto px-2.5 pt-5">
              <NavLinks items={items} collapsed={collapsed} />
            </div>
            {!collapsed ? <UpcomingModules planned={planned} /> : null}
          </div>
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-2 border-b border-[#e5eee8] bg-white/82 px-4.5 backdrop-blur lg:px-8 dark:border-[#22332c] dark:bg-[#0f1f1a]/80">
          <Sheet>
            <SheetTrigger className="lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Buka menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-full flex-col">
                <div className="flex min-h-[72px] items-center justify-between border-b border-[#edf2ee] px-4 py-4">
                  <Brand name={appName} />
                </div>
                <div className="flex-1 overflow-y-auto px-2.5 pt-5">
                  <NavLinks items={items} />
                </div>
                <UpcomingModules planned={planned} />
              </div>
            </SheetContent>
          </Sheet>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={toggle}
            aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            <PanelLeftIcon className="size-[19px]" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" aria-label="Notifikasi" className="relative hidden rounded-lg size-[35px] text-[#71877d] hover:bg-[#eef6f0] hover:text-[#176148] sm:inline-flex dark:text-[#6b7f76] dark:hover:bg-[#162620] dark:hover:text-[#b8e8c8]">
            <Bell className="size-[19px]" />
            <span className="absolute top-[7px] right-[7px] size-[6px] rounded-full border border-white bg-[#e38a4b] dark:border-[#0f1f1a]" />
          </Button>
          <UserMenu {...user} />
        </header>
        <main className="flex-1 p-4.5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}