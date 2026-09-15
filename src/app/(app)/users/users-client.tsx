"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { SearchIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Role, UserWithRoles } from "@/lib/types";
import { deleteUser, setUserActive } from "./actions";
import { UserDeleteDialog } from "./_components/user-delete-dialog";
import { UserFormDialog } from "./_components/user-form-dialog";
import { UsersTable } from "./_components/users-table";

type RoleOption = Pick<Role, "id" | "name" | "slug" | "school_id">;
type SchoolOption = { id: string; name: string };

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  assignRole: boolean;
};

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
      if (!needle) return true;
      return [user.full_name, user.email ?? "", user.jabatan ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [query, users, schoolFilter, isSuperAdmin]);

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
          <h1 className="font-heading text-2xl font-semibold">Manajemen User</h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun staf sekolah dan atur role-nya.
          </p>
        </div>
        {permissions.create ? (
          <Button onClick={openCreate}>
            <UserPlusIcon data-icon="inline-start" />
            Tambah User
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>Daftar User</CardTitle>
            <CardDescription>
              {filtered.length} dari {users.length} user
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isSuperAdmin ? (
              <select
                value={schoolFilter}
                onChange={(event) => setSchoolFilter(event.target.value)}
                aria-label="Filter sekolah"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-52 dark:bg-input/30"
              >
                <option value="">Semua sekolah</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="relative sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau email..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada user</p>
              <p className="text-sm text-muted-foreground">
                {users.length === 0
                  ? "Tambahkan user pertama untuk sekolah ini."
                  : "Tidak ada user yang cocok dengan pencarian."}
              </p>
            </div>
          ) : (
            <UsersTable
              users={filtered}
              schoolNames={schoolNames}
              isSuperAdmin={isSuperAdmin}
              currentUserId={currentUserId}
              permissions={permissions}
              isPending={isPending}
              onEdit={openEdit}
              onToggleActive={handleToggleActive}
              onDelete={setDeleting}
            />
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        roles={roles}
        schools={schools}
        isSuperAdmin={isSuperAdmin}
        currentSchoolId={currentSchoolId}
        permissions={permissions}
      />

      <UserDeleteDialog
        user={deleting}
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={handleDelete}
        isPending={isPending}
      />
    </div>
  );
}
