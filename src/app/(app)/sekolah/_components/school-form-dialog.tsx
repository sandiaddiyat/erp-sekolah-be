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
import { Separator } from "@/components/ui/separator";
import type { FormState, SchoolWithCounts } from "@/lib/types";
import { saveSchool } from "../actions";

export function SchoolFormDialog({
  open,
  onOpenChange,
  school,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolWithCounts | null;
}) {
  const isEdit = Boolean(school);
  const [withAdmin, setWithAdmin] = useState(false);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveSchool,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Ubah Sekolah" : "Daftarkan Sekolah"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Perbarui identitas sekolah dan masa aktifnya."
                : "Sekolah baru otomatis mendapat 4 role bawaan. Kamu juga bisa langsung membuatkan akun adminnya."}
            </DialogDescription>
          </DialogHeader>

          {school ? <input type="hidden" name="id" value={school.id} /> : null}
          <input
            type="hidden"
            name="create_admin"
            value={withAdmin ? "true" : "false"}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Sekolah</Label>
              <Input
                id="name"
                name="name"
                defaultValue={school?.name ?? ""}
                placeholder="Contoh: SMP Nurul Huda"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={school?.slug ?? ""}
                placeholder="otomatis dari nama"
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="level">Jenjang</Label>
              <Input
                id="level"
                name="level"
                defaultValue={school?.level ?? ""}
                placeholder="SMP / SMA / MI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npsn">NPSN</Label>
              <Input
                id="npsn"
                name="npsn"
                defaultValue={school?.npsn ?? ""}
                placeholder="8 digit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={school?.phone ?? ""}
                placeholder="021xxxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Sekolah</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={school?.email ?? ""}
              placeholder="info@sekolah.sch.id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              name="address"
              defaultValue={school?.address ?? ""}
              placeholder="Jalan, nomor, kota"
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={school?.status ?? "trial"}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="trial">Uji Coba</option>
                <option value="active">Aktif</option>
                <option value="suspended">Suspend</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active_until">Masa Aktif Sampai</Label>
              <Input
                id="active_until"
                name="active_until"
                type="date"
                defaultValue={school?.active_until ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Kosongkan bila tanpa batas waktu.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Input
              id="notes"
              name="notes"
              defaultValue={school?.notes ?? ""}
              placeholder="Catatan internal, mis. tanggal penagihan"
            />
          </div>

          {!isEdit ? (
            <>
              <Separator />
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="with_admin"
                  checked={withAdmin}
                  onCheckedChange={(checked) => setWithAdmin(Boolean(checked))}
                />
                <Label htmlFor="with_admin" className="cursor-pointer">
                  Buatkan akun admin sekolah sekarang
                </Label>
              </div>

              {withAdmin ? (
                <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_name">Nama Admin</Label>
                    <Input
                      id="admin_name"
                      name="admin_name"
                      placeholder="Contoh: Siti Aminah"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">Email Admin</Label>
                    <Input
                      id="admin_email"
                      name="admin_email"
                      type="email"
                      placeholder="admin@sekolah.sch.id"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="admin_password">Password Awal</Label>
                    <Input
                      id="admin_password"
                      name="admin_password"
                      type="password"
                      placeholder="Minimal 8 karakter"
                    />
                    <p className="text-xs text-muted-foreground">
                      Berikan password ini ke admin sekolah, dan minta segera
                      diganti.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
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
                  : "Daftarkan Sekolah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
