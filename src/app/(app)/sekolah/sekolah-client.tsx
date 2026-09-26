"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { subscriptionProblem } from "@/lib/school";
import type { SchoolStatus, SchoolWithCounts } from "@/lib/types";
import { setSchoolStatus } from "./actions";
import { SchoolFormDialog } from "./_components/school-form-dialog";
import { SchoolDetailDialog } from "./_components/school-detail-dialog";
import { SchoolProfileForm } from "./_components/school-profile-form";
import {
  SekolahTable,
  type SchoolColumnKey,
} from "./_components/sekolah-table";

export function SekolahClient({ schools }: { schools: SchoolWithCounts[] }) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolWithCounts | null>(null);
  const [viewing, setViewing] = useState<SchoolWithCounts | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SchoolWithCounts | null>(
    null
  );
  const [isPending, startTransition] = useTransition();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortColumn, setSortColumn] = useState<SchoolColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((school) =>
      [school.name, school.slug, school.npsn ?? "", school.level ?? "", school.status]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, schools]);

  const sorted = useMemo(() => {
    const getVal = (school: SchoolWithCounts): string => {
      switch (sortColumn) {
        case "name":
          return school.name;
        case "status":
          return school.status;
        case "user_count":
          return String(school.user_count);
        case "role_count":
          return String(school.role_count);
        default:
          return "";
      }
    };
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      return getVal(a).localeCompare(getVal(b), "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sorted.length);
  const paginatedSchools = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (column: SchoolColumnKey) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const changeStatus = (school: SchoolWithCounts, status: SchoolStatus) => {
    startTransition(async () => {
      const result = await setSchoolStatus(school.id, status);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
    });
  };

  const expiredCount = schools.filter(
    (school) => subscriptionProblem(school) !== null
  ).length;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (school: SchoolWithCounts) => {
    setEditing(school);
    setFormOpen(true);
  };

  const openProfile = (school: SchoolWithCounts) => {
    setEditingProfile(school);
    setProfileOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1190px] w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#4c9a77]">
            Profil Sekolah
          </p>
          <h1 className="font-heading text-2xl font-bold text-[#183d32]">
            Sekolah
          </h1>
          <p className="mt-1 text-sm text-[#82978d]">
            Daftarkan sekolah baru dan atur masa aktifnya.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
        >
          <PlusIcon data-icon="inline-start" className="size-4" />
          Daftarkan Sekolah
        </Button>
      </div>

      {expiredCount > 0 ? (
        <div className="rounded-lg border border-[#e8bcb4] bg-[#fcf3e3] px-3.5 py-2.5 text-sm text-[#a67437]">
          {expiredCount} sekolah perlu perpanjangan atau sedang disuspend.
        </div>
      ) : null}

      <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 border-b border-[#edf2ee] sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle className="font-heading text-[#21483b]">
              Daftar Sekolah
            </CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {sorted.length} dari {schools.length} sekolah
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Cari nama, slug, atau NPSN..."
              className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
            />
            {isSearchFocused ? (
              <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                  Pencarian mencakup
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                    Nama
                  </span>
                  <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                    Slug
                  </span>
                  <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                    NPSN
                  </span>
                  <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                    Level
                  </span>
                  <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                    Status
                  </span>
                </div>
                <p className="mt-2.5 text-[10px] leading-relaxed text-[#8b9f95]">
                  Ketik satu kata — kolom di atas dicek.
                </p>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {sorted.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#3e5c50]">
                {query ? "Tidak ada sekolah yang cocok dengan pencarian." : "Belum ada sekolah"}
              </p>
              {query ? null : (
                <p className="text-sm text-[#a0afa8]">
                  Daftarkan sekolah pertama untuk mulai.
                </p>
              )}
            </div>
          ) : (
            <>
              <SekolahTable
                schools={paginatedSchools}
                isPending={isPending}
                onEdit={openEdit}
                onProfile={openProfile}
                onChangeStatus={changeStatus}
                onRowClick={setViewing}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#8b9f95]">
                    Menampilkan {rangeStart}–{rangeEnd} dari {sorted.length} sekolah
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#6c8279]">
                    Baris
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setPage(1);
                      }}
                      className="h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs font-normal text-[#284a3d] outline-none focus:border-[#9dc7a8]"
                    >
                      {[5, 10, 20, 30].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                  >
                    Sebelumnya
                  </Button>
                  <span className="px-1.5 text-xs font-semibold text-[#537467]">
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                    className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SchoolFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        school={editing}
      />

      <SchoolProfileForm
        open={profileOpen}
        onOpenChange={setProfileOpen}
        school={editingProfile}
      />

      <SchoolDetailDialog
        school={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}