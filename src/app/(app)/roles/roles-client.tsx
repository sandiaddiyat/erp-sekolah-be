"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldPlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Permission, RoleWithCounts } from "@/lib/types";
import { deleteRole } from "./actions";
import { RoleDeleteDialog } from "./_components/role-delete-dialog";
import { RoleFormDialog } from "./_components/role-form-dialog";
import { RolesTable } from "./_components/roles-table";

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
};

type SchoolOption = { id: string; name: string };

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

  const visibleRoles = useMemo(() => {
    if (!isSuperAdmin || !schoolFilter) {
      return filtered;
    }
    return filtered.filter((role) => role.school_id === schoolFilter);
  }, [filtered, schoolFilter, isSuperAdmin]);

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
          <p className="text-sm text-muted-foreground">
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
        <CardHeader className="gap-3 border-b border-[#edf2ee] sm:grid-cols-[1fr_auto] sm:items-center">
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau slug role..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
            </div>
            {isSuperAdmin ? (
              <select
                value={schoolFilter}
                onChange={(event) => setSchoolFilter(event.target.value)}
                aria-label="Filter sekolah"
                className="h-8 w-full rounded-[9px] border border-[#dfeae3] bg-white px-2.5 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a] focus:ring-[#4f9970]/10 sm:w-56"
              >
                <option value="">Semua sekolah</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {visibleRoles.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada role</p>
              <p className="text-sm text-muted-foreground">
                Buat role pertama untuk mulai mengatur hak akses.
              </p>
            </div>
          ) : (
            <RolesTable
              roles={visibleRoles}
              schoolNames={schoolNames}
              isSuperAdmin={isSuperAdmin}
              abilities={abilities}
              isPending={isPending}
              onEdit={openEdit}
              onDelete={setDeleting}
            />
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
