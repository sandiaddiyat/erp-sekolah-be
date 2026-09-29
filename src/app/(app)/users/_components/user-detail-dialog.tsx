"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserIcon } from "lucide-react";
import type { UserWithRoles } from "@/lib/types";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[.04em] text-[#8b9f95]">
        {label}
      </dt>
      <dd
        className="mt-1 truncate text-xs text-[#2b493e]"
        title={typeof value === "string" ? value : undefined}
      >
        {value || "-"}
      </dd>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function UserDetailDialog({
  user,
  schoolNames,
  isSuperAdmin,
  currentUserId,
  onClose,
}: {
  user: UserWithRoles | null;
  schoolNames: Map<string, string>;
  isSuperAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
}) {
  if (!user) return null;

  const schoolName = user.school_id
    ? (schoolNames.get(user.school_id) ?? "Platform")
    : "Platform";

  return (
    <Dialog open={Boolean(user)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[760px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
            Manajemen user
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail User
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan informasi akun user.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 shrink-0 rounded-[14px] border-2 border-[#e2ece5]">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.full_name ?? "User"} />
              ) : null}
              <AvatarFallback className="rounded-[14px] bg-[#def1e2] text-[#2b7254] font-semibold">
                {user.full_name ? getInitials(user.full_name) : <UserIcon className="size-7" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#2b493e]">
                {user.full_name}
                {user.id === currentUserId ? (
                  <span className="ml-1.5 text-xs font-normal text-[#8b9f95]">(Anda)</span>
                ) : null}
              </p>
              <p className="truncate text-xs text-[#9aaa9f]">{user.email ?? "-"}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-1.5">
            <Badge
              className={
                user.is_active
                  ? "rounded-[99px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254] gap-[5px]"
                  : "rounded-[99px] border-transparent bg-[#fdf0ee] px-[8px] py-[4px] text-[9px] font-bold text-[#ad685d] gap-[5px]"
              }
            >
              <span
                className={
                  "size-[5px] shrink-0 rounded-full " +
                  (user.is_active ? "bg-[#2b7254]" : "bg-[#ad685d]")
                }
              />
              {user.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>

          <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
            Informasi Akun
          </h3>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
            <DetailRow label="Nama Lengkap" value={user.full_name} />
            <DetailRow label="Email" value={user.email} />
            <DetailRow label="Jabatan" value={user.jabatan} />
            <DetailRow
              label="Sekolah"
              value={
                isSuperAdmin ? schoolName : user.school_id ? schoolName : "-"
              }
            />
            <DetailRow label="No. HP" value={user.phone} />
            <DetailRow
              label="Status"
              value={user.is_active ? "Aktif" : "Nonaktif"}
            />
          </dl>

          <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
            Role
          </h3>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {user.roles.length === 0 ? (
              <span className="text-xs text-[#83988e]">Belum ada role</span>
            ) : (
              user.roles.map((role) => (
                <Badge
                  key={role.id}
                  variant="secondary"
                  className="bg-[#eef6f0] text-[10px] font-semibold text-[#4b8669]"
                >
                  {role.name}
                </Badge>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
