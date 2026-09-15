"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const [isPending, startTransition] = useTransition();

  const schoolNames = useMemo(
    () => new Map(schools.map((school) => [school.id, school.name])),
    [schools]
  );

  const visibleRoles = useMemo(() => {
    if (!isSuperAdmin || !schoolFilter) return roles;
    return roles.filter((role) => role.school_id === schoolFilter);
  }, [roles, schoolFilter, isSuperAdmin]);

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
          <h1 className="font-heading text-2xl font-semibold">
            Role &amp; Hak Akses
          </h1>
          <p className="text-sm text-muted-foreground">
            Tentukan role apa saja yang ada dan modul apa yang boleh diakses.
          </p>
        </div>
        {abilities.create ? (
          <Button onClick={openCreate}>
            <ShieldPlusIcon data-icon="inline-start" />
            Tambah Role
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>Daftar Role</CardTitle>
            <CardDescription>
              {visibleRoles.length} dari {roles.length} role
            </CardDescription>
          </div>
          {isSuperAdmin ? (
            <select
              value={schoolFilter}
              onChange={(event) => setSchoolFilter(event.target.value)}
              aria-label="Filter sekolah"
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56 dark:bg-input/30"
            >
              <option value="">Semua sekolah</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          ) : null}
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
