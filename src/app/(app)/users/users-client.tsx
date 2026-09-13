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
  PowerIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
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
import type { Role, UserWithRoles } from "@/lib/types";
import { deleteUser, saveUser, setUserActive, type FormState } from "./actions";

type RoleOption = Pick<Role, "id" | "name" | "slug" | "school_id">;

type SchoolOption = { id: string; name: string };

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  assignRole: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) return "Belum pernah";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  {isSuperAdmin ? (
                    <TableHead className="hidden lg:table-cell">
                      Sekolah
                    </TableHead>
                  ) : null}
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Terakhir Login
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">
                          {user.full_name || "(tanpa nama)"}
                          {user.id === currentUserId ? (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              (Anda)
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                        {user.jabatan ? (
                          <p className="text-xs text-muted-foreground">
                            {user.jabatan}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    {isSuperAdmin ? (
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {user.school_id
                          ? (schoolNames.get(user.school_id) ?? "—")
                          : "Platform"}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            Belum ada role
                          </span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary">
                              {role.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        variant={user.is_active ? "default" : "outline"}
                        className="gap-1"
                      >
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                      {formatDate(user.last_login_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" disabled={isPending} />
                          }
                        >
                          <MoreHorizontalIcon />
                          <span className="sr-only">Aksi</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {permissions.update ? (
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              <PencilIcon />
                              Ubah
                            </DropdownMenuItem>
                          ) : null}
                          {permissions.update && user.id !== currentUserId ? (
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(user)}
                            >
                              <PowerIcon />
                              {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </DropdownMenuItem>
                          ) : null}
                          {permissions.delete && user.id !== currentUserId ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleting(user)}
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

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus user ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <span className="font-medium">{deleting?.full_name}</span>{" "}
              akan dihapus permanen beserta seluruh aksesnya. Tindakan ini tidak
              bisa dibatalkan.
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

function UserFormDialog({
  open,
  onOpenChange,
  user,
  roles,
  schools,
  isSuperAdmin,
  currentSchoolId,
  permissions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  roles: RoleOption[];
  schools: SchoolOption[];
  isSuperAdmin: boolean;
  currentSchoolId: string | null;
  permissions: Permissions;
}) {
  const isEdit = Boolean(user);
  const [selectedSchool, setSelectedSchool] = useState(
    user?.school_id ?? currentSchoolId ?? ""
  );
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveUser,
    undefined
  );

  // Role hanya berlaku di dalam satu sekolah, jadi daftarnya ikut sekolah
  // yang dipilih. Role tanpa sekolah (global) selalu ditampilkan.
  const availableRoles = roles.filter(
    (role) => role.school_id === null || role.school_id === selectedSchool
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const selectedRoleIds = new Set(user?.roles.map((role) => role.id) ?? []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah User" : "Tambah User"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Perbarui data user, status, dan role-nya."
                : "Buat akun baru. User langsung bisa login dengan password ini."}
            </DialogDescription>
          </DialogHeader>

          {user ? <input type="hidden" name="id" value={user.id} /> : null}
          {isSuperAdmin ? (
            <input type="hidden" name="school_included" value="true" />
          ) : null}
          {permissions.assignRole ? (
            <input type="hidden" name="roles_included" value="true" />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={user?.full_name ?? ""}
              placeholder="Contoh: Siti Aminah"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email ?? ""}
                placeholder="nama@sekolah.sch.id"
                disabled={isEdit}
                required={!isEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jabatan">Jabatan</Label>
              <Input
                id="jabatan"
                name="jabatan"
                defaultValue={user?.jabatan ?? ""}
                placeholder="Contoh: Staf TU"
              />
            </div>
          </div>

          {isSuperAdmin ? (
            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah</Label>
              <select
                id="school_id"
                name="school_id"
                value={selectedSchool}
                onChange={(event) => setSelectedSchool(event.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">Tanpa sekolah (platform)</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Daftar role di bawah mengikuti sekolah yang dipilih.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">No. HP</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={user?.phone ?? ""}
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isEdit ? "Password Baru (opsional)" : "Password"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={isEdit ? "Biarkan kosong bila tidak diubah" : "Minimal 6 karakter"}
                required={!isEdit}
              />
            </div>
          </div>

          {permissions.assignRole ? (
            <div className="space-y-2">
              <Label>Role</Label>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {availableRoles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada role untuk sekolah ini. Buat role dulu di menu
                    Role &amp; Hak Akses.
                  </p>
                ) : (
                  availableRoles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-start gap-2.5"
                    >
                      <Checkbox
                        name="role_ids"
                        value={role.id}
                        defaultChecked={selectedRoleIds.has(role.id)}
                        className="mt-0.5"
                      />
                      <span className="text-sm">{role.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2.5">
            <Checkbox
              id="is_active"
              name="is_active"
              value="true"
              defaultChecked={user ? user.is_active : true}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Akun aktif (bisa login)
            </Label>
          </div>

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
                  : "Buat User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
