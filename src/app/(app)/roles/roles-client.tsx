"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Columns3Icon,
  SearchIcon,
  ShieldPlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Permission, RoleWithCounts } from "@/lib/types";
import { deleteRole } from "./actions";
import { RoleDeleteDialog } from "./_components/role-delete-dialog";
import {
  RoleFormDialog,
} from "./_components/role-form-dialog";
import {
  RolesTable,
  type RoleColumnKey,
} from "./_components/roles-table";

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
};

type SchoolOption = { id: string; name: string };

const columns: { key: RoleColumnKey; label: string }[] = [
  { key: "name", label: "Role" },
  { key: "school", label: "Sekolah" },
  { key: "permission_count", label: "Hak Akses" },
  { key: "user_count", label: "User" },
];

export function RolesClient({
  roles,
  permissions,
  rolePermissions,
  schools,
  isSuperAdmin,
  abilities,
  canAssignRole,
}: {
  roles: RoleWithCounts[];
  permissions: Permission[];
  rolePermissions: Record<string, string[]>;
  schools: SchoolOption[];
  isSuperAdmin: boolean;
  abilities: Permissions;
  canAssignRole: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleWithCounts | null>(null);
  const [deleting, setDeleting] = useState<RoleWithCounts | null>(null);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<RoleColumnKey>>(
    () => new Set(columns.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<RoleColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const schoolNames = useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(needle) ||
        role.slug.toLowerCase().includes(needle)
    );
  }, [query, roles]);

  const sorted = useMemo(() => {
    const valueFor = (role: RoleWithCounts): string => {
      switch (sortColumn) {
        case "name":
          return role.name;
        case "school":
          return role.school_id ? (schoolNames.get(role.school_id) ?? "Global") : "Global";
        case "permission_count":
          return String(role.permission_count);
        case "user_count":
          return String(role.user_count);
        default:
          return "";
      }
    };
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      return valueFor(a).localeCompare(valueFor(b), "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sortColumn, sortDirection, schoolNames]);

  const visibleRoles = useMemo(() => {
    if (!isSuperAdmin || !schoolFilter) {
      return sorted;
    }
    return sorted.filter((role) => role.school_id === schoolFilter);
  }, [sorted, schoolFilter, isSuperAdmin]);

  const totalPages = Math.max(1, Math.ceil(visibleRoles.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = visibleRoles.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, visibleRoles.length);
  const paginatedRoles = visibleRoles.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSort = (column: RoleColumnKey) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (key: RoleColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      const visibleCount = columns.filter(
        (item) => next.has(item.key) && (isSuperAdmin || item.key !== "school")
      ).length;
      return visibleCount === 0 ? prev : next;
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteRole(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (role: RoleWithCounts) => {
    setEditing(role);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]">
            Pengaturan
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">
            Role &amp; Hak Akses
          </h1>
          <p className="mt-1 text-sm text-[#82978d]">
            Tentukan role apa saja yang ada dan modul apa yang boleh diakses.
          </p>
        </div>
        {abilities.create ? (
          <Button
            onClick={openCreate}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <ShieldPlusIcon data-icon="inline-start" className="size-4" />
            Tambah Role
          </Button>
        ) : null}
      </div>

      <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 border-b border-[#edf2ee] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-[#21483b]">
              Daftar Role
            </CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {visibleRoles.length} dari {roles.length} role
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
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
                  </div>
                  <p className="mt-2.5 text-[10px] leading-relaxed text-[#8b9f95]">
                    Ketik satu kata — kolom di atas dicek.
                  </p>
                </div>
              ) : null}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 shrink-0 border-[#e2ece5] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                  />
                }
              >
                <Columns3Icon className="size-4 text-[#4d8669]" />
                <span>Kolom</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-[#e2ece5] bg-white text-[#5d7a6e]">
                {columns.filter((col) => isSuperAdmin || col.key !== "school").map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    className="text-xs text-[#5d7a6e] focus:bg-[#f4faf5]"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {isSuperAdmin ? (
          <div className="border-b border-[#f0f5f1] px-6 py-3">
            <select
              value={schoolFilter}
              onChange={(event) => {
                setSchoolFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter sekolah"
              className="h-9 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
            >
              <option value="">Semua sekolah</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <CardContent className="px-0">
          {visibleRoles.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#3e5c50]">
                Belum ada role
              </p>
              <p className="text-sm text-[#a0afa8]">
                Buat role pertama untuk mulai mengatur hak akses.
              </p>
            </div>
          ) : (
            <>
              <RolesTable
                roles={paginatedRoles}
                schoolNames={schoolNames}
                isSuperAdmin={isSuperAdmin}
                abilities={abilities}
                isPending={isPending}
                visibleColumns={visibleColumns}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
                onEdit={openEdit}
                onDelete={setDeleting}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#8b9f95]">
                    Menampilkan {rangeStart}–{rangeEnd} dari {visibleRoles.length} role
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

      <RoleFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editing}
        permissions={permissions}
        initialPermissionIds={
          editing ? (rolePermissions[editing.id] ?? []) : []
        }
        canAssignRole={canAssignRole}
      />

      <RoleDeleteDialog
        role={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
