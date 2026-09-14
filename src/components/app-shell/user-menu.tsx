"use client";

import { useTransition } from "react";
import { LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="h-9 gap-2 px-1.5" />}
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {initials(name)}
        </span>
        <span className="hidden max-w-32 truncate text-sm sm:inline">
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-1">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            {email ? (
              <p className="truncate text-xs font-normal text-muted-foreground">
                {email}
              </p>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {isSuperAdmin || roles.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="flex flex-wrap gap-1 px-1.5 py-1.5">
              {isSuperAdmin ? (
                <Badge variant="default" className="gap-1">
                  <ShieldCheckIcon />
                  Super Admin
                </Badge>
              ) : null}
              {roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          disabled={isPending}
        >
          <LogOutIcon />
          {isPending ? "Keluar..." : "Keluar"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
