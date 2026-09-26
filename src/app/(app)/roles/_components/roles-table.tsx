"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RoleWithCounts } from "@/lib/types";

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
};

export function RolesTable({
  roles,
  schoolNames,
  isSuperAdmin,
  abilities,
  isPending,
  onEdit,
  onDelete,
}: {
  roles: RoleWithCounts[];
  schoolNames: Map<string, string>;
  isSuperAdmin: boolean;
  abilities: Permissions;
  isPending: boolean;
  onEdit: (role: RoleWithCounts) => void;
  onDelete: (role: RoleWithCounts) => void;
}) {
  const scrollbarHiddenStyle = { scrollbarWidth: "none" } as const;

  return (
    <div className="overflow-x-auto" style={scrollbarHiddenStyle}>
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
            <TableHead className="px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279]">
              Role
            </TableHead>
            {isSuperAdmin ? (
              <TableHead className="hidden px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] lg:table-cell">
                Sekolah
              </TableHead>
            ) : null}
            <TableHead className="hidden px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] sm:table-cell">
              Hak Akses
            </TableHead>
            <TableHead className="hidden px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] sm:table-cell">
              User
            </TableHead>
            <TableHead className="sticky right-0 z-20 w-10 bg-white pr-6 text-right text-[10px] font-bold text-[#6c8279] shadow-[-8px_0_8px_-8px_#1c44331a]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id} className="group border-b border-[#f0f5f1] hover:bg-[#f6fbf7]">
              <TableCell className="px-3.5 py-3 align-middle">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12px] font-semibold text-[#2b493e]">
                      {role.name}
                    </p>
                    {role.is_system ? (
                      <Badge
                        variant="outline"
                        className="rounded-[5px] border-transparent bg-[#eef6f0] px-[8px] py-[4px] text-[9px] font-bold text-[#4b8669]"
                      >
                        Bawaan
                      </Badge>
                    ) : null}
                  </div>
                  {role.description ? (
                    <p className="truncate text-xs text-[#8b9f95]">
                      {role.description}
                    </p>
                  ) : null}
                  <p className="truncate font-mono text-[10px] text-[#7d9389]">
                    {role.slug}
                  </p>
                </div>
              </TableCell>
              {isSuperAdmin ? (
                <TableCell className="hidden text-xs text-[#537467] lg:table-cell">
                  {role.school_id
                    ? (schoolNames.get(role.school_id) ?? "—")
                    : "Global"}
                </TableCell>
              ) : null}
              <TableCell className="hidden px-3.5 py-3 align-middle sm:table-cell">
                <Badge
                  variant="secondary"
                  className="rounded-[5px] border-transparent bg-[#eef6f0] px-[8px] py-[4px] text-[9px] font-bold text-[#4b8669]"
                >
                  {role.permission_count} izin
                </Badge>
              </TableCell>
              <TableCell className="hidden px-3.5 py-3 align-middle text-xs text-[#537467] sm:table-cell">
                {role.user_count} user
              </TableCell>
              <TableCell className="sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isPending}
                        className="text-[#537467] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    }
                  >
                  <MoreHorizontalIcon />
                  <span className="sr-only">Aksi</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {abilities.update ? (
                    <DropdownMenuItem onClick={() => onEdit(role)}>
                      <PencilIcon />
                      Ubah
                    </DropdownMenuItem>
                  ) : null}
                  {abilities.delete && !role.is_system ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(role)}
                      >
                        <Trash2Icon />
                        Hapus
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}
