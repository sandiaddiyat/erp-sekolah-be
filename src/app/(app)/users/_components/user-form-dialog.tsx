"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState, Role, UserWithRoles } from "@/lib/types";
import { saveUser } from "../actions";

type RoleOption = Pick<Role, "id" | "name" | "slug" | "school_id">;
type SchoolOption = { id: string; name: string };

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  assignRole: boolean;
};

export function UserFormDialog({
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
                placeholder={isEdit ? "Biarkan kosong bila tidak diubah" : "Minimal 8 karakter"}
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
