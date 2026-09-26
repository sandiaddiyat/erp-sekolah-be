"use client";

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RoleWithCounts } from "@/lib/types";

const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

export type RoleColumnKey = "name" | "school" | "permission_count" | "user_count";

const allColumns: { key: RoleColumnKey; label: string }[] = [
  { key: "name", label: "Role" },
  { key: "school", label: "Sekolah" },
  { key: "permission_count", label: "Hak Akses" },
  { key: "user_count", label: "User" },
];

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = "",
}: {
  label: string;
  column: RoleColumnKey;
  sortColumn: RoleColumnKey;
  sortDirection: "asc" | "desc";
  onSort: (column: RoleColumnKey) => void;
  className?: string;
}) {
  const isSorted = sortColumn === column;
  return (
    <TableHead
      onClick={() => onSort(column)}
      className={`cursor-pointer select-none whitespace-nowrap px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] hover:text-[#2b7254] ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={isSorted ? "text-[#2b7254]" : ""}>{label}</span>
        {isSorted ? (
          sortDirection === "asc" ? (
            <ArrowUpIcon className="size-3.5 shrink-0 text-[#2b7254]" />
          ) : (
            <ArrowDownIcon className="size-3.5 shrink-0 text-[#2b7254]" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5 shrink-0 text-[#9aaa9f]" />
        )}
      </div>
    </TableHead>
  );
}

export function RolesTable({
  roles,
  schoolNames,
  isSuperAdmin,
  abilities,
  isPending,
  visibleColumns,
  sortColumn,
  sortDirection,
  onSort,
  onEdit,
  onDelete,
}: {
  roles: RoleWithCounts[];
  schoolNames: Map<string, string>;
  isSuperAdmin: boolean;
  abilities: { create: boolean; update: boolean; delete: boolean };
  isPending: boolean;
  visibleColumns: Set<RoleColumnKey>;
  sortColumn: RoleColumnKey;
  sortDirection: "asc" | "desc";
  onSort: (column: RoleColumnKey) => void;
  onEdit: (role: RoleWithCounts) => void;
  onDelete: (role: RoleWithCounts) => void;
}) {
  const columnList = allColumns.filter(
    (column) =>
      visibleColumns.has(column.key) &&
      (isSuperAdmin || column.key !== "school")
  );

  return (
    <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
            {columnList.map((col, index) => (
              <SortableHeader
                key={col.key}
                label={col.label}
                column={col.key}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={onSort}
                className={
                  index === 0
                    ? "sticky left-0 z-20 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a]"
                    : ""
                }
              />
            ))}
            <TableHead className="sticky right-0 z-20 w-10 justify-end bg-white pr-6 text-right text-[10px] font-bold text-[#6c8279] shadow-[-8px_0_8px_-8px_#1c44331a]">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow
              key={role.id}
              className="group border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
            >
              {columnList.map((col) => {
                const sticky = col.key === "name";
                const base = `px-3.5 py-3 align-middle ${sticky ? "sticky left-0 z-10 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]" : ""}`;
                switch (col.key) {
                  case "name":
                    return (
                      <TableCell key={col.key} className={base}>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-[12px] font-semibold text-[#2b493e]">
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
                    );
                  case "school":
                    return (
                      <TableCell key={col.key} className={`${base} min-w-[150px] text-xs text-[#537467]`}>
                        {role.school_id
                          ? (schoolNames.get(role.school_id) ?? "—")
                          : "Global"}
                      </TableCell>
                    );
                  case "permission_count":
                    return (
                      <TableCell key={col.key} className={base}>
                        <Badge
                          variant="secondary"
                          className="rounded-[5px] border-transparent bg-[#eef6f0] px-[8px] py-[4px] text-[9px] font-bold text-[#4b8669]"
                        >
                          {role.permission_count} izin
                        </Badge>
                      </TableCell>
                    );
                  case "user_count":
                    return (
                      <TableCell key={col.key} className={`${base} min-w-[100px] text-xs text-[#537467]`}>
                        {role.user_count} user
                      </TableCell>
                    );
                  default:
                    return null;
                }
              })}
              <TableCell className="sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]">
                <div className="flex items-center justify-end gap-1">
                  {abilities.update ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Ubah"
                      disabled={isPending}
                      className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(role);
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  ) : null}
                  {abilities.delete && !role.is_system ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus"
                      disabled={isPending}
                      className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:border-[#fed4d1] hover:bg-[#fdf0ee] hover:text-[#ad685d]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(role);
                      }}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
