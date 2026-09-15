"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
import { MODULE_LABELS, MODULE_ORDER } from "@/lib/rbac";
import type { FormState, Permission, RoleWithCounts } from "@/lib/types";
import { saveRole } from "../actions";

function moduleRank(module: string): number {
  const index = MODULE_ORDER.indexOf(module);
  return index === -1 ? 99 : index;
}

export function RoleFormDialog({
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
