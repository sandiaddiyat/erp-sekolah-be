"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
      <DialogContent className="border-[#dbe8df] bg-[#fbfdfb] sm:max-w-4xl">
        <form action={formAction} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-[#183d32]">
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

          {/* Identitas */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="name" className="text-xs font-bold text-[#4c6a5e]">
                Nama Sekolah
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={school?.name ?? ""}
                placeholder="Contoh: SMP Nurul Huda"
                required
                className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-xs font-bold text-[#4c6a5e]">
                Slug
              </Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={school?.slug ?? ""}
                placeholder="otomatis dari nama"
                disabled={isEdit}
                className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level" className="text-xs font-bold text-[#4c6a5e]">
                Jenjang
              </Label>
              <Input
                id="level"
                name="level"
                defaultValue={school?.level ?? ""}
                placeholder="SMP / SMA / MI"
                className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npsn" className="text-xs font-bold text-[#4c6a5e]">
                NPSN
              </Label>
              <Input
                id="npsn"
                name="npsn"
                defaultValue={school?.npsn ?? ""}
                placeholder="8 digit"
                className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold text-[#4c6a5e]">
                Telepon
              </Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={school?.phone ?? ""}
                placeholder="021xxxxxxx"
                className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="email" className="text-xs font-bold text-[#4c6a5e]">
                Email Sekolah
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={school?.email ?? ""}
                placeholder="info@sekolah.sch.id"
                className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
            </div>
          </div>

          <Separator className="border-[#e3ece6]" />

          {/* Alamat */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-xs font-bold text-[#4c6a5e]">
              Alamat
            </Label>
            <Input
              id="address"
              name="address"
              defaultValue={school?.address ?? ""}
              placeholder="Jalan, nomor, kota"
              className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
            />
          </div>

          <Separator className="border-[#e3ece6]" />

          {/* Status & Masa Aktif */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-bold text-[#4c6a5e]">
                Status
              </Label>
              <select
                id="status"
                name="status"
                defaultValue={school?.status ?? "trial"}
                className="h-8 w-full rounded-lg border border-[#dfeae3] bg-transparent px-2.5 text-sm text-[#284a3d] outline-none focus-visible:border-[#78ad8a] focus-visible:ring-[#4f9970]/10"
              >
                <option value="trial">Uji Coba</option>
                <option value="active">Aktif</option>
                <option value="suspended">Suspend</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="active_until"
                className="text-xs font-bold text-[#4c6a5e]"
              >
                Masa Aktif Sampai
              </Label>
              <Input
                id="active_until"
                name="active_until"
                type="date"
                defaultValue={school?.active_until ?? ""}
                className="border-[#dfeae3] text-[#284a3d] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
              />
              <p className="text-xs text-[#9aaa9f]">
                Kosongkan bila tanpa batas waktu.
              </p>
            </div>
          </div>

          <Separator className="border-[#e3ece6]" />

          {/* Catatan */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-bold text-[#4c6a5e]">
              Catatan
            </Label>
            <Input
              id="notes"
              name="notes"
              defaultValue={school?.notes ?? ""}
              placeholder="Catatan internal, mis. tanggal penagihan"
              className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
            />
          </div>

          {!isEdit ? (
            <>
              <Separator className="border-[#e3ece6]" />

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="with_admin"
                  checked={withAdmin}
                  onCheckedChange={(checked) => setWithAdmin(Boolean(checked))}
                  className="border-[#c1d6c8] text-[#2e7a58] focus:ring-[#4f9970]/10 data-[state=checked]:bg-[#2e7a58] data-[state=checked]:text-white"
                />
                <Label
                  htmlFor="with_admin"
                  className="text-xs font-bold text-[#4c6a5e] cursor-pointer"
                >
                  Buatkan akun admin sekolah sekarang
                </Label>
              </div>

              {withAdmin ? (
                <div className="grid gap-4 rounded-lg border border-[#e2ece5] p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="admin_name"
                      className="text-xs font-bold text-[#4c6a5e]"
                    >
                      Nama Admin
                    </Label>
                    <Input
                      id="admin_name"
                      name="admin_name"
                      placeholder="Contoh: Siti Aminah"
                      className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="admin_email"
                      className="text-xs font-bold text-[#4c6a5e]"
                    >
                      Email Admin
                    </Label>
                    <Input
                      id="admin_email"
                      name="admin_email"
                      type="email"
                      placeholder="admin@sekolah.sch.id"
                      className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label
                      htmlFor="admin_password"
                      className="text-xs font-bold text-[#4c6a5e]"
                    >
                      Password Awal
                    </Label>
                    <Input
                      id="admin_password"
                      name="admin_password"
                      type="password"
                      placeholder="Minimal 8 karakter"
                      className="border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10"
                    />
                    <p className="text-xs text-[#9aaa9f]">
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
              className="border-[#d7e6dc] text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="border-[#185743] bg-[#185743] text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
            >
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
