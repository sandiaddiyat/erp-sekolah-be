"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Columns3Icon,
  FilterIcon,
  SearchIcon,
  UserPlusIcon,
  XIcon,
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
import type { Role, UserWithRoles } from "@/lib/types";
import { deleteUser, setUserActive } from "./actions";
import { UserDeleteDialog } from "./_components/user-delete-dialog";
import { UserFormDialog } from "./_components/user-form-dialog";
import { UsersTable, type UserColumnKey } from "./_components/users-table";

type RoleOption = Pick<Role, "id" | "name" | "slug" | "school_id">;
type SchoolOption = { id: string; name: string };

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  assignRole: boolean;
};

const columns: { key: UserColumnKey; label: string }[] = [
  { key: "name", label: "Nama" },
  { key: "school", label: "Sekolah" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
  { key: "lastLogin", label: "Terakhir Login" },
];

export function UsersClient({
  users,
  roles,
  schools,
  isSuperAdmin,
  currentSchoolId,
  permissions,
  currentUserId,
}: {
  users: UserWithRoles[];
  roles: RoleOption[];
  schools: SchoolOption[];
  isSuperAdmin: boolean;
  currentSchoolId: string | null;
  permissions: Permissions;
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserWithRoles | null>(null);
  const [deleting, setDeleting] = useState<UserWithRoles | null>(null);
  const [schoolFilter, setSchoolFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<UserColumnKey>>(
    () => new Set(columns.map((column) => column.key))
  );
  const [sortColumn, setSortColumn] = useState<UserColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPending, startTransition] = useTransition();

  const schoolNames = useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (isSuperAdmin && schoolFilter && user.school_id !== schoolFilter) {
        return false;
      }
      if (roleFilter && !user.roles.some((role) => role.id === roleFilter)) {
        return false;
      }
      if (!needle) return true;
      return [
        user.full_name,
        user.email ?? "",
        user.jabatan ?? "",
        ...user.roles.map((role) => role.name),
        user.school_id ? (schoolNames.get(user.school_id) ?? "") : "Platform",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, users, schoolFilter, roleFilter, isSuperAdmin, schoolNames]);

  const sorted = useMemo(() => {
    const valueFor = (user: UserWithRoles): string => {
      switch (sortColumn) {
        case "school":
          return user.school_id ? (schoolNames.get(user.school_id) ?? "") : "Platform";
        case "role":
          return user.roles.map((role) => role.name).join(", ");
        case "status":
          return user.is_active ? "Aktif" : "Nonaktif";
        case "lastLogin":
          return user.last_login_at ?? "";
        case "name":
        default:
          return user.full_name ?? "";
      }
    };

    return [...filtered].sort((left, right) => {
      const result = valueFor(left).localeCompare(valueFor(right), "id", {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filtered, schoolNames, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sorted.length);
  const paginatedUsers = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const activeFilterCount = [schoolFilter, roleFilter].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const handleSort = (column: UserColumnKey) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (column: UserColumnKey) => {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      const visibleCount = columns.filter(
        (item) => next.has(item.key) && (isSuperAdmin || item.key !== "school")
      ).length;
      return visibleCount === 0 ? current : next;
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (user: UserWithRoles) => {
    setEditing(user);
    setFormOpen(true);
  };

  const handleToggleActive = (user: UserWithRoles) => {
    startTransition(async () => {
      const result = await setUserActive(user.id, !user.is_active);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteUser(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]">
            Pengaturan
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">
            Manajemen User
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun staf sekolah dan atur role-nya.
          </p>
        </div>
        {permissions.create ? (
          <Button
            onClick={openCreate}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <UserPlusIcon data-icon="inline-start" className="size-4" />
            Tambah User
          </Button>
        ) : null}
      </div>

      <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-[#21483b]">Daftar User</CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {sorted.length} dari {users.length} user
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                placeholder="Cari user..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
              {isSearchFocused ? (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                  <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                    Pencarian mencakup
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Nama", "Email", "Jabatan", "Role", "Sekolah"].map((label) => (
                      <span key={label} className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsFilterOpen((current) => !current)}
              className={isFilterOpen || hasActiveFilters
                ? "relative h-8 gap-1.5 shrink-0 rounded-[8px] border-[#185743] bg-[#185743] px-3 text-[10px] font-bold text-white hover:bg-[#124636]"
                : "relative h-8 gap-1.5 shrink-0 rounded-[8px] border-[#e2ece5] bg-white px-3 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"}
            >
              <FilterIcon className="size-3.5" />
              Filter
              {activeFilterCount > 0 ? <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#d06a5d] text-[9px] font-bold text-white">{activeFilterCount}</span> : null}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0 border-[#e2ece5] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]" />}
              >
                <Columns3Icon className="size-4 text-[#4d8669]" />
                <span>Kolom</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-[#e2ece5] bg-white text-[#5d7a6e]">
                {columns.filter((column) => isSuperAdmin || column.key !== "school").map((column) => (
                  <DropdownMenuCheckboxItem key={column.key} checked={visibleColumns.has(column.key)} onCheckedChange={() => toggleColumn(column.key)} className="text-xs text-[#5d7a6e] focus:bg-[#f4faf5]">
                    {column.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {isFilterOpen ? (
          <div className="mx-6 mb-5 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-[14px] font-semibold tracking-[-.03em] text-[#24483b]">Filter Data User</p>
                <p className="mt-0.5 text-[10px] text-[#93a49c]">Kombinasikan filter untuk mempersempit hasil.</p>
              </div>
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={() => { setSchoolFilter(""); setRoleFilter(""); }} className="h-7 gap-1.5 rounded-[8px] px-2.5 text-[10px] font-bold text-[#ad685d] hover:bg-[#fdf0ee] hover:text-[#ad685d]">
                  <XIcon className="size-3.5" /> Hapus semua filter
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              {isSuperAdmin ? (
                <label className="flex flex-col gap-1.5 text-[10px] font-bold text-[#4c6a5e]">
                  Sekolah
                  <select value={schoolFilter} onChange={(event) => { setSchoolFilter(event.target.value); setPage(1); }} className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] font-normal text-[#36584a] outline-none focus:border-[#78ad8a]">
                    <option value="">Semua</option>
                    {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                  </select>
                </label>
              ) : null}
              <label className="flex flex-col gap-1.5 text-[10px] font-bold text-[#4c6a5e]">
                Role
                <select value={roleFilter} onChange={(event) => { setRoleFilter(event.target.value); setPage(1); }} className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] font-normal text-[#36584a] outline-none focus:border-[#78ad8a]">
                  <option value="">Semua</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        <CardContent className="px-0">
          <UsersTable
            users={paginatedUsers}
            schoolNames={schoolNames}
            isSuperAdmin={isSuperAdmin}
            currentUserId={currentUserId}
            permissions={permissions}
            isPending={isPending}
            visibleColumns={visibleColumns}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={openEdit}
            onToggleActive={handleToggleActive}
            onDelete={setDeleting}
            hasResults={sorted.length > 0}
            hasQuery={Boolean(query.trim()) || hasActiveFilters}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8b9f95]">Menampilkan {rangeStart}–{rangeEnd} dari {sorted.length} user</span>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-[#6c8279]">
                Baris
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs font-normal text-[#284a3d] outline-none focus:border-[#9dc7a8]">
                  {[5, 10, 20, 30].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]">Sebelumnya</Button>
              <span className="px-1.5 text-xs font-semibold text-[#537467]">{safePage} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]">Berikutnya</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <UserFormDialog key={editing?.id ?? "new"} open={formOpen} onOpenChange={setFormOpen} user={editing} roles={roles} schools={schools} isSuperAdmin={isSuperAdmin} currentSchoolId={currentSchoolId} permissions={permissions} />
      <UserDeleteDialog user={deleting} open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} onConfirm={handleDelete} isPending={isPending} />
    </div>
  );
}
