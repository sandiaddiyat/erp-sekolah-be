"use client";

import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  BanIcon,
  PencilIcon,
  RotateCcwIcon,
  SchoolIcon,
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
import {
  SCHOOL_STATUS_LABELS,
  daysUntilActiveEnd,
  formatActiveUntil,
  subscriptionProblem,
} from "@/lib/school";
import type { SchoolStatus, SchoolWithCounts } from "@/lib/types";

const STATUS_CLASS: Record<SchoolStatus, string> = {
  active: "rounded-[99px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254]",
  trial: "rounded-[99px] border-transparent bg-[#fcf3e3] px-[8px] py-[4px] text-[9px] font-bold text-[#a67437]",
  suspended: "rounded-[99px] border-transparent bg-[#fdf0ee] px-[8px] py-[4px] text-[9px] font-bold text-[#ad685d]",
};

const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

export type SchoolColumnKey = "name" | "status" | "user_count" | "role_count";

function StatusCell({ school }: { school: SchoolWithCounts }) {
  const problem = subscriptionProblem(school);
  const days = daysUntilActiveEnd(school);

  return (
    <div className="space-y-1">
      <Badge className={STATUS_CLASS[school.status]}>
        {SCHOOL_STATUS_LABELS[school.status]}
      </Badge>
      <p className="text-xs text-[#9aaa9f]">
        s/d {formatActiveUntil(school.active_until)}
      </p>
      {problem === "expired" ? (
        <p className="text-xs text-[#ad685d]">Masa aktif sudah lewat</p>
      ) : days !== null && days >= 0 && days <= 30 ? (
        <p className="text-xs text-[#a67437]">Tersisa {days} hari</p>
      ) : null}
    </div>
  );
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className = "",
}: {
  label: string;
  column: SchoolColumnKey;
  sortColumn: SchoolColumnKey;
  sortDirection: "asc" | "desc";
  onSort: (column: SchoolColumnKey) => void;
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

export function SekolahTable({
  schools,
  isPending,
  onEdit,
  onChangeStatus,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
}: {
  schools: SchoolWithCounts[];
  isPending: boolean;
  onEdit: (school: SchoolWithCounts) => void;
  onChangeStatus: (school: SchoolWithCounts, status: SchoolStatus) => void;
  onRowClick: (school: SchoolWithCounts) => void;
  sortColumn: SchoolColumnKey;
  sortDirection: "asc" | "desc";
  onSort: (column: SchoolColumnKey) => void;
}) {
  return (
    <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
            <SortableHeader
              label="Sekolah"
              column="name"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="pl-6"
            />
            <SortableHeader
              label="Status"
              column="status"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden md:table-cell"
            />
            <SortableHeader
              label="User"
              column="user_count"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden sm:table-cell"
            />
            <SortableHeader
              label="Role"
              column="role_count"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={onSort}
              className="hidden sm:table-cell"
            />
            <TableHead className="sticky right-0 z-20 w-10 justify-end bg-white pr-6 text-right text-[10px] font-bold text-[#6c8279] shadow-[-8px_0_8px_-8px_#1c44331a]">
              Aksi
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.map((school) => (
            <TableRow
              key={school.id}
              className="group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
              onClick={() => onRowClick(school)}
            >
              <TableCell className="px-3.5 py-3 align-middle">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#def1e2]">
                    <SchoolIcon className="size-4 text-[#2b7254]" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-[#2b493e]">
                      {school.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-[#7d9389]">
                      {school.slug}
                    </p>
                    {school.level || school.npsn ? (
                      <p className="truncate text-xs text-[#9aaa9f]">
                        {[school.level, school.npsn && `NPSN ${school.npsn}`]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden px-3.5 py-3 align-middle md:table-cell">
                <StatusCell school={school} />
              </TableCell>
              <TableCell className="hidden px-3.5 py-3 text-sm text-[#3e5c50] align-middle sm:table-cell">
                {school.user_count}
              </TableCell>
              <TableCell className="hidden px-3.5 py-3 text-sm text-[#3e5c50] align-middle sm:table-cell">
                {school.role_count}
              </TableCell>
              <TableCell className="sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Ubah"
                    disabled={isPending}
                    className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(school);
                    }}
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={school.status === "suspended" ? "Aktifkan kembali" : "Suspend"}
                    disabled={isPending}
                    className={
                      school.status === "suspended"
                        ? "border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                        : "border border-[#e1ebe4] bg-white text-[#ad685d] hover:border-[#fed4d1] hover:bg-[#fdf0ee] hover:text-[#ad685d]"
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeStatus(
                        school,
                        school.status === "suspended" ? "active" : "suspended"
                      );
                    }}
                  >
                    {school.status === "suspended" ? (
                      <RotateCcwIcon className="size-4" />
                    ) : (
                      <BanIcon className="size-4" />
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
