"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { saveSchoolProfile } from "../profile-actions";
import { cn } from "@/lib/utils";
import type { SekolahProfileInput } from "@/lib/validations/sekolah";
import type { School, SchoolWithCounts } from "@/lib/types";

/**
 * Status mode lihat dibaca lewat context, jadi tidak perlu meneruskan
 * `readOnly` ke tiap field satu per satu.
 */
const ReadOnlyContext = React.createContext(false);

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const readOnly = React.useContext(ReadOnlyContext);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-[#4c6a5e]">{label}</Label>
      <Input
        {...props}
        readOnly={readOnly}
        className={cn(
          "border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10",
          readOnly && "bg-[#f6faf7] text-[#5c7268] cursor-default"
        )}
      />
    </div>
  );
}

function TextAreaField({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const readOnly = React.useContext(ReadOnlyContext);
  return (
    <div className="space-y-2">
      <Label className="text-xs font-bold text-[#4c6a5e]">{label}</Label>
      <Textarea
        {...props}
        readOnly={readOnly}
        className={cn(
          "border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10",
          readOnly && "bg-[#f6faf7] text-[#5c7268] cursor-default"
        )}
      />
    </div>
  );
}

const DEFAULTS: SekolahProfileInput = {
  id: "",
  npsn: "",
  name: "",
  nis_nss_nds: "",
  alamat: "",
  kode_pos: "",
  telepon: "",
  kelurahan: "",
  kecamatan: "",
  kota: "",
  provinsi: "",
  website: "",
  email: "",
  dinas: "",
};

function buildDefaults(school: SchoolWithCounts | null): SekolahProfileInput {
  if (!school) return DEFAULTS;
  return {
    id: school.id,
    npsn: school.npsn ?? "",
    name: school.name,
    nis_nss_nds: school.nis_nss_nds ?? "",
    alamat: school.address ?? "",
    kode_pos: school.kode_pos ?? "",
    telepon: school.phone ?? "",
    kelurahan: school.kelurahan ?? "",
    kecamatan: school.kecamatan ?? "",
    kota: school.kota ?? "",
    provinsi: school.provinsi ?? "",
    website: school.website ?? "",
    email: school.email ?? "",
    dinas: school.dinas ?? "",
  };
}

type SchoolProfileFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolWithCounts | null;
};

/**
 * Isi form (field + tombol simpan) tanpa pembungkus Dialog. Dipakai baik di
 * modal pada halaman /sekolah maupun langsung di halaman /profil-sekolah.
 * Menyimpan state form dan pemanggilan server action di dalamnya, lalu memberi
 * tahu pemanggil lewat `onSaved` bila berhasil.
 */
function SchoolProfileFormBody({
  school,
  onCancel,
  submitLabel,
  onSaved,
  variant = "dialog",
}: {
  school: SchoolWithCounts | null;
  onCancel: () => void;
  submitLabel: string;
  onSaved: () => void;
  /**
   * `dialog` mengunci tinggi dan menggulir isinya sendiri karena modal punya
   * viewport terbatas. `page` membiarkan card tumbuh penuh dan scroll terjadi
   * di halaman, supaya tidak ada dua scrollbar yang tumpang tindih.
   */
  variant?: "dialog" | "page";
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  // Halaman profil sekolah dibuka dalam mode lihat: input nonaktif sampai
  // pengguna menekan "Ubah". Modal di /sekolah tidak perlu ini karena sudah
  // dipicu dari aksi "Ubah Profil".
  const [isEditing, setIsEditing] = React.useState(false);
  const [values, setValues] = React.useState<SekolahProfileInput>(() =>
    buildDefaults(school)
  );
  const prevSchoolRef = useRef(school);

  useEffect(() => {
    if (school !== prevSchoolRef.current) {
      prevSchoolRef.current = school;
      setValues(buildDefaults(school));
      setIsEditing(false);
    }
  }, [school]);

  const update = (field: keyof SekolahProfileInput, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  // Kembalikan input ke data tersimpan lalu kembali ke mode lihat.
  const cancelEdit = () => {
    setValues(buildDefaults(school));
    setIsEditing(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const result = await saveSchoolProfile(values);
    setIsSubmitting(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    if (result?.success) {
      toast.success(result.success);
      onSaved();
    }
  };

  const isPage = variant === "page";
  const readOnly = isPage && !isEditing;

  return (
    <ReadOnlyContext.Provider value={readOnly}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (readOnly) return;
        handleSubmit();
      }}
      className={
        isPage
          ? "flex flex-col"
          : "flex h-full max-h-[min(92vh,900px)] flex-col"
      }
    >
      <div
        className={
          isPage
            ? "px-7 pt-[22px] pb-[25px] space-y-5"
            : "flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        }
      >
            {/* Identitas Sekolah */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="NPSN"
                name="npsn"
                value={values.npsn}
                onChange={(e) => update("npsn", e.target.value)}
                placeholder="8 digit"
                required
              />
              <Field
                label="NIS / NSS / NDS"
                name="nis_nss_nds"
                value={values.nis_nss_nds}
                onChange={(e) => update("nis_nss_nds", e.target.value)}
                placeholder="Opsional"
              />
              <Field
                label="Dinas"
                name="dinas"
                value={values.dinas}
                onChange={(e) => update("dinas", e.target.value)}
                placeholder="Opsional"
              />
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold text-[#4c6a5e]">
                  Nama Sekolah
                </Label>
                <Input
                  name="name"
                  value={values.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Contoh: SMP Nurul Huda"
                  required
                  readOnly={readOnly}
                  className={cn(
                    "border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10",
                    readOnly && "bg-[#f6faf7] text-[#5c7268] cursor-default"
                  )}
                />
              </div>
            </div>

            <Separator className="border-[#e3ece6]" />

            {/* Kontak & Digital */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="E-mail"
                name="email"
                type="email"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="info@sekolah.sch.id"
              />
              <Field
                label="Nomor Telepon"
                name="telepon"
                value={values.telepon}
                onChange={(e) => update("telepon", e.target.value)}
                placeholder="021xxxxxxx"
              />
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-bold text-[#4c6a5e]">
                  Website
                </Label>
                <Input
                  name="website"
                  value={values.website}
                  onChange={(e) => update("website", e.target.value)}
                  placeholder="https://sekolah.sch.id"
                  readOnly={readOnly}
                  className={cn(
                    "border-[#dfeae3] text-[#284a3d] placeholder-[#91a49a] focus:border-[#78ad8a] focus:ring-[#4f9970]/10",
                    readOnly && "bg-[#f6faf7] text-[#5c7268] cursor-default"
                  )}
                />
              </div>
            </div>

            <Separator className="border-[#e3ece6]" />

            {/* Alamat */}
            <TextAreaField
              label="Alamat Lengkap"
              name="alamat"
              value={values.alamat}
              onChange={(e) => update("alamat", e.target.value)}
              placeholder="Jalan, nomor, kelurahan"
              rows={2}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Provinsi"
                name="provinsi"
                value={values.provinsi}
                onChange={(e) => update("provinsi", e.target.value)}
                placeholder="Opsional"
              />
              <Field
                label="Kota / Kabupaten"
                name="kota"
                value={values.kota}
                onChange={(e) => update("kota", e.target.value)}
                placeholder="Opsional"
              />
              <Field
                label="Kecamatan"
                name="kecamatan"
                value={values.kecamatan}
                onChange={(e) => update("kecamatan", e.target.value)}
                placeholder="Opsional"
              />
              <Field
                label="Kelurahan / Desa"
                name="kelurahan"
                value={values.kelurahan}
                onChange={(e) => update("kelurahan", e.target.value)}
                placeholder="Opsional"
              />
              <Field
                label="Kode Pos"
                name="kode_pos"
                value={values.kode_pos}
                onChange={(e) => update("kode_pos", e.target.value)}
                placeholder="Opsional"
              />
            </div>
          </div>

      <div className="flex w-full justify-end gap-2 border-t border-[#e3ece6] bg-white px-7 py-4">
        {readOnly ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            Ubah Profil
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={isPage ? cancelEdit : onCancel}
              className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
            >
              {isSubmitting ? "Menyimpan..." : submitLabel}
            </Button>
          </>
        )}
      </div>
    </form>
    </ReadOnlyContext.Provider>
  );
}

/** Versi modal, dipakai dari halaman /sekolah. */
export function SchoolProfileForm({
  open,
  onOpenChange,
  school,
}: SchoolProfileFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-2xl rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
            Profil Sekolah
          </span>
          <DialogTitle className="font-heading text-[#183d32]">
            {school ? "Ubah Profil Sekolah" : "Form Profil Sekolah"}
          </DialogTitle>
          <DialogDescription>
            {school
              ? "Perbarui data identitas dan kontak sekolah."
              : "Isi identitas sekolah secara lengkap dan akurat."}
          </DialogDescription>
        </DialogHeader>

        <SchoolProfileFormBody
          school={school}
          onCancel={() => onOpenChange(false)}
          submitLabel={school ? "Simpan Perubahan" : "Simpan Profil"}
          onSaved={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/**
 * Versi halaman penuh untuk admin sekolah. Menampilkan form di dalam Card tanpa
 * pembungkus modal, lalu me-revalidate router agar data terbaru termuat.
 */
export function SchoolProfilePageForm({ school }: { school: School }) {
  const router = useRouter();

  return (
    <SchoolProfileFormBody
      school={{ ...school, user_count: 0, role_count: 0, notes: "" }}
      onCancel={() => router.push("/dashboard")}
      submitLabel="Simpan Perubahan"
      onSaved={() => router.refresh()}
      variant="page"
    />
  );
}