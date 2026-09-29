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
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-2xl rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
              Manajemen role
            </span>
            <DialogTitle className="font-heading text-[#183d32]">
              {isEdit ? "Ubah Role" : "Tambah Role"}
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
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

          <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-[#4c6a5e]">
                  Nama Role
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={role?.name ?? ""}
                  placeholder="Contoh: Wali Kelas"
                  required
                  className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-bold text-[#4c6a5e]">
                  Deskripsi
                </Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={role?.description ?? ""}
                  placeholder="Keterangan singkat"
                  className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
                />
              </div>
            </div>

            {canAssignRole ? (
              <div className="space-y-2">
                <div className="mt-4 flex items-center justify-between">
                  <Label className="text-xs font-bold text-[#4c6a5e]">Hak Akses</Label>
                  <span className="text-xs text-[#9aaa9f]">
                    {totalSelected} dari {permissions.length} dipilih
                  </span>
                </div>
                <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-[9px] border border-[#e2ece5] bg-white p-3">
                  {grouped.map(([module, items]) => {
                    const allChecked = items.every((item) =>
                      selected.has(item.id)
                    );
                    return (
                      <div key={module} className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[#2b493e]">
                            {MODULE_LABELS[module] ?? module}
                          </p>
                          <button
                            type="button"
                            onClick={() => toggleModule(items, !allChecked)}
                            className="text-xs font-bold text-[#4b8669] hover:text-[#2b7254]"
                          >
                            {allChecked ? "Kosongkan" : "Pilih semua"}
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {items.map((permission) => (
                            <label
                              key={permission.id}
                              className="flex cursor-pointer items-start gap-2.5 rounded-[6px] border border-transparent p-1.5 hover:bg-[#f4faf5]"
                            >
                              <Checkbox
                                checked={selected.has(permission.id)}
                                onCheckedChange={(checked) =>
                                  togglePermission(permission.id, checked)
                                }
                                className="mt-0.5 border-[#c1d6c8] text-[#2e7a58] focus:ring-[#4f9970]/10 data-[state=checked]:bg-[#2e7a58] data-[state=checked]:text-white"
                              />
                              <span className="text-sm leading-tight text-[#2b493e]">
                                {permission.name}
                                <span className="block font-mono text-xs text-[#8b9f95]">
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
          </div>

          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 pb-[25px]">
            <div className="flex w-full justify-end gap-2 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : isEdit
                  ? "Simpan Perubahan"
                  : "Buat Role"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
