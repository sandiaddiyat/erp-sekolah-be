"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  MoreHorizontalIcon,
  PencilIcon,
  ShieldPlusIcon,
  Trash2Icon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MODULE_LABELS, MODULE_ORDER } from "@/lib/rbac";
import type { Permission, RoleWithCounts } from "@/lib/types";
import { deleteRole, saveRole, type FormState } from "./actions";

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
};

function moduleRank(module: string): number {
  const index = MODULE_ORDER.indexOf(module);
  return index === -1 ? 99 : index;
}

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
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin ? (
                    <TableHead className="hidden lg:table-cell">
                      Sekolah
                    </TableHead>
                  ) : null}
                  <TableHead className="hidden sm:table-cell">
                    Hak Akses
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">User</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRoles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{role.name}</p>
                          {role.is_system ? (
                            <Badge variant="outline" className="text-[10px]">
                              Bawaan
                            </Badge>
                          ) : null}
                        </div>
                        {role.description ? (
                          <p className="text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        ) : null}
                        <p className="font-mono text-xs text-muted-foreground">
                          {role.slug}
                        </p>
                      </div>
                    </TableCell>
                    {isSuperAdmin ? (
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {role.school_id
                          ? (schoolNames.get(role.school_id) ?? "—")
                          : "Global"}
                      </TableCell>
                    ) : null}
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary">
                        {role.permission_count} izin
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {role.user_count} user
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
                          {abilities.update ? (
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(role);
                                setFormOpen(true);
                              }}
                            >
                              <PencilIcon />
                              Ubah
                            </DropdownMenuItem>
                          ) : null}
                          {abilities.delete && !role.is_system ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(role)}
                              >
                                <Trash2Icon />
                                Hapus
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus role ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Role{" "}
              <span className="font-medium">{deleting?.name}</span> akan dihapus
              permanen. Pastikan tidak ada user yang masih memakainya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoleFormDialog({
  open,
  onOpenChange,
  role,
  permissions,
  initialPermissionIds,
  canAssignRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleWithCounts | null;
  permissions: Permission[];
  initialPermissionIds: string[];
  canAssignRole: boolean;
}) {
  const isEdit = Boolean(role);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialPermissionIds)
  );
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveRole,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const permission of permissions) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }
    return Array.from(map.entries()).sort(
      ([a], [b]) => moduleRank(a) - moduleRank(b)
    );
  }, [permissions]);

  const togglePermission = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleModule = (items: Permission[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const item of items) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const totalSelected = selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Role" : "Tambah Role"}</DialogTitle>
            <DialogDescription>
              {canAssignRole
                ? "Tentukan nama role dan centang hak akses yang dimilikinya."
                : "Anda bisa mengubah nama role, tetapi tidak punya izin mengubah hak aksesnya."}
            </DialogDescription>
          </DialogHeader>

          {role ? <input type="hidden" name="id" value={role.id} /> : null}
          {canAssignRole
            ? Array.from(selected).map((id) => (
                <input
                  key={id}
                  type="hidden"
                  name="permission_ids"
                  value={id}
                />
              ))
            : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Role</Label>
              <Input
                id="name"
                name="name"
                defaultValue={role?.name ?? ""}
                placeholder="Contoh: Wali Kelas"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                name="description"
                defaultValue={role?.description ?? ""}
                placeholder="Keterangan singkat"
              />
            </div>
          </div>

          {canAssignRole ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hak Akses</Label>
                <span className="text-xs text-muted-foreground">
                  {totalSelected} dari {permissions.length} dipilih
                </span>
              </div>
              <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                {grouped.map(([module, items]) => {
                  const allChecked = items.every((item) =>
                    selected.has(item.id)
                  );
                  return (
                    <div key={module} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {MODULE_LABELS[module] ?? module}
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleModule(items, !allChecked)}
                          className="text-xs text-primary hover:underline"
                        >
                          {allChecked ? "Kosongkan" : "Pilih semua"}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((permission) => (
                          <label
                            key={permission.id}
                            className="flex cursor-pointer items-start gap-2"
                          >
                            <Checkbox
                              checked={selected.has(permission.id)}
                              onCheckedChange={(checked) =>
                                togglePermission(permission.id, checked)
                              }
                              className="mt-0.5"
                            />
                            <span className="text-sm leading-tight">
                              {permission.name}
                              <span className="block font-mono text-xs text-muted-foreground">
                                {permission.slug}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Buat Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
