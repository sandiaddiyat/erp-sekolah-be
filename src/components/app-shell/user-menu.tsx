"use client";

import { useTransition } from "react";
import { ChevronDownIcon, Settings2Icon, LogOutIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/auth-actions";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function UserMenu({
  name,
  email,
  roles,
  isSuperAdmin,
}: {
  name: string;
  email: string | null;
  roles: string[];
  isSuperAdmin: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
  };

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : roles[0] ?? email ?? "Pengguna";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-[5px_0] text-[#38584b]"
          >
            <span className="grid size-[31px] shrink-0 place-items-center rounded-full bg-[#d9eedb] text-[10px] font-bold text-[#286247]">
              {initials(name)}
            </span>
            <span className="hidden text-[12px] font-bold sm:inline">
              {name}
            </span>
            <ChevronDownIcon className="hidden size-[15px] sm:block" />
          </button>
        }
      >
        <span className="sr-only">Menu profil</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[190px] rounded-[12px] border-[#e2ece5] p-3 shadow-[0_15px_35px_#1441301f]">
        <div>
          <p className="truncate text-[12px] font-bold text-[#21463a]">{name}</p>
          <p className="mt-[3px] mb-3 block truncate text-[10px] text-[#92a59b]">
            {roleLabel}
          </p>
        </div>

        <DropdownMenuItem
          className="gap-2 rounded-md px-[3px] py-2 text-[11px] text-[#627d70] focus:bg-[#f0f7f2] focus:text-[#2b7254] data-[highlighted]:bg-[#f0f7f2] data-highlighted:text-[#2b7254] [&_svg:not([class*='size-'])]:size-[15px]"
        >
          <Settings2Icon />
          Pengaturan akun
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-[#edf2ee]" />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isPending}
          className="gap-2 rounded-md px-[3px] py-2 text-[11px] text-[#627d70] focus:bg-[#fff1ef] focus:text-[#ad685d] data-[highlighted]:bg-[#fff1ef] data-highlighted:text-[#ad685d] [&_svg:not([class*='size-'])]:size-[15px]"
        >
          <LogOutIcon />
          {isPending ? "Keluar..." : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}