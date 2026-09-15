"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  PowerIcon,
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
import type { UserWithRoles } from "@/lib/types";

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  assignRole: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "Belum pernah";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

export function UsersTable({
  users,
  schoolNames,
  isSuperAdmin,
  currentUserId,
  permissions,
  isPending,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  users: UserWithRoles[];
  schoolNames: Map<string, string>;
  isSuperAdmin: boolean;
  currentUserId: string;
  permissions: Permissions;
  isPending: boolean;
  onEdit: (user: UserWithRoles) => void;
  onToggleActive: (user: UserWithRoles) => void;
  onDelete: (user: UserWithRoles) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          {isSuperAdmin ? (
            <TableHead className="hidden lg:table-cell">Sekolah</TableHead>
          ) : null}
          <TableHead>Role</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden lg:table-cell">Terakhir Login</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>
              <div className="space-y-0.5">
                <p className="font-medium">
                  {user.full_name || "(tanpa nama)"}
                  {user.id === currentUserId ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      (Anda)
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                {user.jabatan ? (
                  <p className="text-xs text-muted-foreground">{user.jabatan}</p>
                ) : null}
              </div>
            </TableCell>
            {isSuperAdmin ? (
              <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                {user.school_id
                  ? (schoolNames.get(user.school_id) ?? "—")
                  : "Platform"}
              </TableCell>
            ) : null}
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {user.roles.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    Belum ada role
                  </span>
                ) : (
                  user.roles.map((role) => (
                    <Badge key={role.id} variant="secondary">
                      {role.name}
                    </Badge>
                  ))
                )}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge
                variant={user.is_active ? "default" : "outline"}
                className="gap-1"
              >
                {user.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </TableCell>
            <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
              {formatDate(user.last_login_at)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon-sm" disabled={isPending} />
                  }
                >
                  <MoreHorizontalIcon />
                  <span className="sr-only">Aksi</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {permissions.update ? (
                    <DropdownMenuItem onClick={() => onEdit(user)}>
                      <PencilIcon />
                      Ubah
                    </DropdownMenuItem>
                  ) : null}
                  {permissions.update && user.id !== currentUserId ? (
                    <DropdownMenuItem onClick={() => onToggleActive(user)}>
                      <PowerIcon />
                      {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </DropdownMenuItem>
                  ) : null}
                  {permissions.delete && user.id !== currentUserId ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onDelete(user)}
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
