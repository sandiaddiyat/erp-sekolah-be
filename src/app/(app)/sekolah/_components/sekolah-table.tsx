"use client";

import {
  BanIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  SchoolIcon,
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

export function SekolahTable({
  schools,
  isPending,
  onEdit,
  onChangeStatus,
  onRowClick,
}: {
  schools: SchoolWithCounts[];
  isPending: boolean;
  onEdit: (school: SchoolWithCounts) => void;
  onChangeStatus: (school: SchoolWithCounts, status: SchoolStatus) => void;
  onRowClick: (school: SchoolWithCounts) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-[#e5eee8]">
          <TableHead className="px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279]">
            Sekolah
          </TableHead>
          <TableHead className="hidden px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] md:table-cell">
            Status
          </TableHead>
          <TableHead className="hidden px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] sm:table-cell">
            User
          </TableHead>
          <TableHead className="hidden px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] sm:table-cell">
            Role
          </TableHead>
          <TableHead className="w-12" />
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
            <TableCell className="px-3 py-3 align-middle">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      className="text-[#8ca096] hover:bg-[#eef7f0] hover:text-[#2b7254]"
                      onClick={(e) => e.stopPropagation()}
                    />
                  }
                >
                  <MoreHorizontalIcon />
                  <span className="sr-only">Aksi</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(school);
                    }}
                  >
                    <PencilIcon />
                    Ubah
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#e3ece6]" />
                  {school.status === "suspended" ? (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeStatus(school, "active");
                      }}
                    >
                      <RotateCcwIcon className="text-[#2b7254]" />
                      Aktifkan kembali
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChangeStatus(school, "suspended");
                      }}
                    >
                      <BanIcon className="text-[#ad685d]" />
                      Suspend
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
