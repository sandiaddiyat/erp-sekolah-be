"use client";

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
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

export type UserColumnKey = "name" | "school" | "role" | "status" | "lastLogin";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

const scrollbarHiddenStyle = { scrollbarWidth: "none" } as const;

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
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  onEdit,
  onToggleActive,
  onDelete,
  hasResults,
  hasQuery,
}: {
  users: UserWithRoles[];
  schoolNames: Map<string, string>;
  isSuperAdmin: boolean;
  currentUserId: string;
  permissions: Permissions;
  isPending: boolean;
  visibleColumns: Set<UserColumnKey>;
  sortColumn: UserColumnKey;
  sortDirection: "asc" | "desc";
  onSort: (column: UserColumnKey) => void;
  onEdit: (user: UserWithRoles) => void;
  onToggleActive: (user: UserWithRoles) => void;
  onDelete: (user: UserWithRoles) => void;
  hasResults: boolean;
  hasQuery: boolean;
}) {
  const allColumns: { key: UserColumnKey; label: string }[] = [
    { key: "name", label: "Nama" },
    { key: "school", label: "Sekolah" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "lastLogin", label: "Terakhir Login" },
  ];
  const columnList = allColumns.filter(
    (column) =>
      visibleColumns.has(column.key) &&
      (isSuperAdmin || column.key !== "school")
  );

  return (
    <div className="overflow-x-auto" style={scrollbarHiddenStyle}>
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
            {columnList.map((column, index) => {
              const isSorted = sortColumn === column.key;
              return (
                <TableHead
                  key={column.key}
                  onClick={() => onSort(column.key)}
                  className={`cursor-pointer select-none whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] hover:text-[#2b7254] ${index === 0 ? "pl-6" : ""} ${column.key === "name" ? "sticky left-0 z-20 bg-white shadow-[8px_0_8px_-8px_#1c44331a]" : ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={isSorted ? "text-[#2b7254]" : ""}>{column.label}</span>
                    {isSorted ? (
                      sortDirection === "asc" ? <ArrowUpIcon className="size-3.5 shrink-0 text-[#2b7254]" /> : <ArrowDownIcon className="size-3.5 shrink-0 text-[#2b7254]" />
                    ) : <ArrowUpDownIcon className="size-3.5 shrink-0 text-[#9aaa9f]" />}
                  </div>
                </TableHead>
              );
            })}
            <TableHead className="sticky right-0 z-20 w-10 bg-white pr-6 text-right text-[10px] font-bold text-[#6c8279] shadow-[-8px_0_8px_-8px_#1c44331a]">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!hasResults ? (
            <TableRow>
              <TableCell colSpan={columnList.length + 1} className="h-32 border-b border-[#f0f5f1] px-6 py-3 text-center text-xs text-[#a0afa8]">
                {hasQuery ? (
                  <p className="text-sm text-[#a0afa8]">Tidak ada user yang cocok dengan pencarian atau filter.</p>
                ) : (
                  <div className="py-6">
                    <p className="text-sm font-medium text-[#3e5c50]">Belum ada user</p>
                    <p className="text-sm text-[#a0afa8]">Tambahkan user pertama untuk mulai.</p>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id} className="group border-b border-[#f0f5f1] hover:bg-[#f6fbf7]">
                {columnList.map((column) => {
                  const sticky = column.key === "name";
                  const base = `px-3.5 py-3 align-middle ${sticky ? "sticky left-0 z-10 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]" : ""}`;
                  switch (column.key) {
                    case "name":
                      return <TableCell key={column.key} className={base}><div className="min-w-[210px] space-y-0.5"><p className="truncate text-[12px] font-semibold text-[#2b493e]" title={user.full_name || "(tanpa nama)"}>{user.full_name || "(tanpa nama)"}{user.id === currentUserId ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Anda)</span> : null}</p><p className="max-w-[260px] truncate text-xs text-[#83988e]" title={user.email ?? ""}>{user.email}</p>{user.jabatan ? <p className="max-w-[220px] truncate text-xs text-[#83988e]" title={user.jabatan}>{user.jabatan}</p> : null}</div></TableCell>;
                    case "school":
                      return <TableCell key={column.key} className={`${base} min-w-[150px] text-xs text-[#537467]`}><span className="block max-w-[220px] truncate" title={user.school_id ? (schoolNames.get(user.school_id) ?? "Platform") : "Platform"}>{user.school_id ? (schoolNames.get(user.school_id) ?? "Platform") : "Platform"}</span></TableCell>;
                    case "role":
                      return <TableCell key={column.key} className={`${base} min-w-[150px]`}><div className="flex max-w-[280px] flex-wrap gap-1">{user.roles.length === 0 ? <span className="text-xs text-[#83988e]">Belum ada role</span> : user.roles.map((role) => <Badge key={role.id} variant="secondary" className="bg-[#eef6f0] text-[10px] font-semibold text-[#4b8669]">{role.name}</Badge>)}</div></TableCell>;
                    case "status":
                      return <TableCell key={column.key} className={`${base} whitespace-nowrap`}><Badge variant={user.is_active ? "default" : "outline"} className={user.is_active ? "gap-1 bg-[#eaf6ed] text-[10px] font-semibold text-[#27704e] hover:bg-[#eaf6ed]" : "gap-1 text-[10px] font-semibold text-[#83988e]"}>{user.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>;
                    case "lastLogin":
                      return <TableCell key={column.key} className={`${base} min-w-[150px] whitespace-nowrap text-xs text-[#83988e]`}>{formatDate(user.last_login_at)}</TableCell>;
                  }
                })}
                <TableCell className="sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={isPending} className="text-[#537467] hover:bg-[#f4faf5] hover:text-[#2b7254]" />}>
                      <MoreHorizontalIcon /><span className="sr-only">Aksi untuk {user.full_name}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {permissions.update ? <DropdownMenuItem onClick={() => onEdit(user)}><PencilIcon />Ubah</DropdownMenuItem> : null}
                      {permissions.update && user.id !== currentUserId ? <DropdownMenuItem onClick={() => onToggleActive(user)}><PowerIcon />{user.is_active ? "Nonaktifkan" : "Aktifkan"}</DropdownMenuItem> : null}
                      {permissions.delete && user.id !== currentUserId ? <><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onClick={() => onDelete(user)}><Trash2Icon />Hapus</DropdownMenuItem></> : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
