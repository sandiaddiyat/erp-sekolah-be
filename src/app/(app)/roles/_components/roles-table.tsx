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
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          {isSuperAdmin ? (
            <TableHead className="hidden lg:table-cell">Sekolah</TableHead>
          ) : null}
          <TableHead className="hidden sm:table-cell">Hak Akses</TableHead>
          <TableHead className="hidden sm:table-cell">User</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{role.name}</p>
                  {role.is_system ? (
                    <Badge variant="outline" className="text-[10px]">
                      Bawaan
                    </Badge>
                  ) : null}
                </div>
                {role.description ? (
                  <p className="text-xs text-muted-foreground">
                    {role.description}
                  </p>
                ) : null}
                <p className="font-mono text-xs text-muted-foreground">
                  {role.slug}
                </p>
              </div>
            </TableCell>
            {isSuperAdmin ? (
              <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                {role.school_id
                  ? (schoolNames.get(role.school_id) ?? "—")
                  : "Global"}
              </TableCell>
            ) : null}
            <TableCell className="hidden sm:table-cell">
              <Badge variant="secondary">
                {role.permission_count} izin
              </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              {role.user_count} user
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
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
  );
}
