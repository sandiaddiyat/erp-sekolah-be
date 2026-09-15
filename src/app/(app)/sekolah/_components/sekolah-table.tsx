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

const STATUS_VARIANT: Record<
  SchoolStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  trial: "secondary",
  suspended: "destructive",
};

function StatusCell({ school }: { school: SchoolWithCounts }) {
  const problem = subscriptionProblem(school);
  const days = daysUntilActiveEnd(school);

  return (
    <div className="space-y-1">
      <Badge variant={STATUS_VARIANT[school.status]}>
        {SCHOOL_STATUS_LABELS[school.status]}
      </Badge>
      <p className="text-xs text-muted-foreground">
        s/d {formatActiveUntil(school.active_until)}
      </p>
      {problem === "expired" ? (
        <p className="text-xs text-destructive">Masa aktif sudah lewat</p>
      ) : days !== null && days >= 0 && days <= 30 ? (
        <p className="text-xs text-amber-600">Tersisa {days} hari</p>
      ) : null}
    </div>
  );
}

export function SekolahTable({
  schools,
  isPending,
  onEdit,
  onChangeStatus,
}: {
  schools: SchoolWithCounts[];
  isPending: boolean;
  onEdit: (school: SchoolWithCounts) => void;
  onChangeStatus: (school: SchoolWithCounts, status: SchoolStatus) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sekolah</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
          <TableHead className="hidden sm:table-cell">User</TableHead>
          <TableHead className="hidden sm:table-cell">Role</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {schools.map((school) => (
          <TableRow key={school.id}>
            <TableCell>
              <div className="space-y-0.5">
                <p className="flex items-center gap-1.5 font-medium">
                  <SchoolIcon className="size-4 text-muted-foreground" />
                  {school.name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {school.slug}
                </p>
                {school.level || school.npsn ? (
                  <p className="text-xs text-muted-foreground">
                    {[school.level, school.npsn && `NPSN ${school.npsn}`]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <StatusCell school={school} />
            </TableCell>
            <TableCell className="hidden text-sm sm:table-cell">
              {school.user_count}
            </TableCell>
            <TableCell className="hidden text-sm sm:table-cell">
              {school.role_count}
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
                  <DropdownMenuItem onClick={() => onEdit(school)}>
                    <PencilIcon />
                    Ubah
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {school.status === "suspended" ? (
                    <DropdownMenuItem
                      onClick={() => onChangeStatus(school, "active")}
                    >
                      <RotateCcwIcon />
                      Aktifkan kembali
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onChangeStatus(school, "suspended")}
                    >
                      <BanIcon />
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
