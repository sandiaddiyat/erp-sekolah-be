"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Pencil,
  IdCard,
  AtSign,
  MapPin,
  Mail,
  Phone,
  Globe,
  ExternalLink,
  Copy,
  PhoneCall,
  Contact2,
  Building,
  Hash,
  Landmark,
  Save,
  Shield,
} from "lucide-react";
import type { School } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { saveSchoolProfile } from "../sekolah/profile-actions";

/**
 * Ditampilkan ketika pengguna tidak punya sekolah (atau, untuk super admin,
 * tidak memilih sekolah lewat `?school=`), sehingga form tidak bisa dirender.
 */
export function NoSchool({
  isSuperAdmin,
  reason,
}: {
  isSuperAdmin: boolean;
  reason?: string;
}) {
  return (
    <div className="mx-auto max-w-[1190px] w-full space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#4c9a77]">
          Profil Sekolah
        </p>
        <h1 className="font-heading text-2xl font-bold text-[#183d32]">
          Belum ada data profil
        </h1>
      </div>

      <div className="rounded-[17px] border border-[#e2ece5] bg-[#fbfdfb] px-6 py-8 text-center shadow-[0_3px_7px_#1c443305]">
        <p className="text-sm text-[#82978d]">
          {reason ??
            (isSuperAdmin
              ? "Pilih sekolah yang profilnya ingin dikelola dari halaman Sekolah."
              : "Akun Anda belum tertaut ke sekolah mana pun. Hubungi administrator sekolah Anda.")}
        </p>
        <Link
          href={isSuperAdmin ? "/sekolah" : "/dashboard"}
          className="mt-4 inline-flex h-9 items-center rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
        >
          {isSuperAdmin ? "Ke halaman Sekolah" : "Kembali ke Dashboard"}
        </Link>
      </div>
    </div>
  );
}

function FieldBox({
  label,
  value,
  placeholder = "— (Belum diisi)",
  icon: Icon,
  actionIcon: ActionIcon,
  badge,
}: {
  label: string;
  value?: string | null;
  placeholder?: string;
  icon?: React.ElementType;
  actionIcon?: React.ElementType;
  badge?: React.ReactNode;
}) {
  const displayValue = value && value.trim() !== "" ? value : null;
  
  return (
    <div className="flex flex-col justify-center rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-[0_1px_3px_0_rgba(15,118,110,0.02)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
          {label}
        </span>
        {badge}
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-[#94a3b8]" />}
          <span
            className={`font-medium ${
              displayValue ? "text-[#0f172a] text-sm" : "text-[#94a3b8] text-sm italic"
            }`}
          >
            {displayValue || placeholder}
          </span>
        </div>
        {ActionIcon && displayValue && (
          <button className="text-[#94a3b8] hover:text-[#0f766e] transition-colors">
            <ActionIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export function SchoolProfileEditView({
  school,
  onCancel,
  onSaved,
}: {
  school: School;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState({
    id: school.id,
    npsn: school.npsn ?? "",
    name: school.name ?? "",
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
    has_double_sessions: school.has_double_sessions ?? false,
  });

  const update = (field: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full space-y-6 pb-12 font-sans">
      {/* HEADER CARD */}
      <div className="flex items-center justify-between rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-[0_1px_3px_0_rgba(15,118,110,0.04)]">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#0f766e] text-white">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-semibold text-[#065f46]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]"></span>
              Mode Edit Aktif
            </span>
            <h1 className="font-heading text-2xl font-bold text-[#0b1c30]">
              Ubah Profil Sekolah
            </h1>
            <p className="mt-0.5 text-sm text-[#64748b]">
              Perbarui data identitas dan kontak sekolah Anda.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* IDENTITAS POKOK */}
        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_3px_0_rgba(15,118,110,0.04)] lg:col-span-8">
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0fdf4] text-[#0f766e]">
              <IdCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Data Identitas Pokok
              </h2>
              <p className="text-[11px] text-[#64748b]">
                Informasi legalitas dan nomenklatur lembaga
              </p>
            </div>
          </div>
          <div className="border-t border-[#f1f5f9] p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">
                Nama Sekolah <span className="text-[#dc2626]">*</span>
              </Label>
              <Input
                name="name"
                value={values.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className="h-10 border-[#cbd5e1] text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#0f172a]">
                  NPSN <span className="text-[#dc2626]">*</span>
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                  <Input
                    name="npsn"
                    value={values.npsn}
                    onChange={(e) => update("npsn", e.target.value)}
                    required
                    className="h-10 border-[#cbd5e1] pl-9 text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-[#0f172a]">
                  NIS / NSS / NDS
                </Label>
                <Input
                  name="nis_nss_nds"
                  value={values.nis_nss_nds}
                  onChange={(e) => update("nis_nss_nds", e.target.value)}
                  placeholder="Opsional (Nomor Statistik)"
                  className="h-10 border-[#cbd5e1] text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">
                Dinas Pembina
              </Label>
              <div className="relative">
                <Landmark className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  name="dinas"
                  value={values.dinas}
                  onChange={(e) => update("dinas", e.target.value)}
                  placeholder="Opsional (misal: Kemenag / Disdik Prov. Jawa Barat)"
                  className="h-10 border-[#cbd5e1] pl-9 text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
                />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4">
              <Checkbox
                id="has_double_sessions"
                checked={values.has_double_sessions}
                onCheckedChange={(c) => update("has_double_sessions", c === true)}
                className="mt-0.5 rounded-[4px] border-[#94a3b8] data-[state=checked]:border-[#0f766e] data-[state=checked]:bg-[#0f766e]"
              />
              <div className="grid gap-1">
                <Label
                  htmlFor="has_double_sessions"
                  className="text-sm font-semibold text-[#0f172a]"
                >
                  Aktifkan sesi ganda (pagi / siang)
                </Label>
                <p className="text-[11px] text-[#64748b]">
                  Centang jika institusi menyelenggarakan kegiatan pembelajaran shift bertahap untuk jenjang berbeda.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KONTAK & MEDIA RESMI */}
        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_3px_0_rgba(15,118,110,0.04)] lg:col-span-4">
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eff6ff] text-[#0284c7]">
              <Contact2 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Kontak & Media Resmi
              </h2>
              <p className="text-[11px] text-[#64748b]">
                Saluran komunikasi aktif bagi wali santri & dinas
              </p>
            </div>
          </div>
          <div className="border-t border-[#f1f5f9] p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">
                E-mail Resmi <span className="text-[#dc2626]">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  name="email"
                  type="email"
                  value={values.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="h-10 border-[#cbd5e1] pl-9 text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">
                Nomor Telepon Kantor <span className="text-[#dc2626]">*</span>
              </Label>
              <div className="relative flex items-center">
                <div className="absolute inset-y-0 left-0 flex items-center border-r border-[#cbd5e1] bg-[#f8fafc] px-3 rounded-l-md">
                  <Phone className="mr-1.5 h-3.5 w-3.5 text-[#94a3b8]" />
                  <span className="text-[11px] font-semibold text-[#64748b]">+62</span>
                </div>
                <Input
                  name="telepon"
                  value={values.telepon}
                  onChange={(e) => update("telepon", e.target.value)}
                  className="h-10 border-[#cbd5e1] pl-[72px] text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">
                Website Lembaga
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input
                  name="website"
                  value={values.website}
                  onChange={(e) => update("website", e.target.value)}
                  className="h-10 border-[#cbd5e1] pl-9 text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ALAMAT & LOKASI */}
      <div className="rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_3px_0_rgba(15,118,110,0.04)]">
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fef2f2] text-[#dc2626]">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Alamat & Lokasi Sekolah
            </h2>
            <p className="text-[11px] text-[#64748b]">
              Data geospasial dan zonasi wilayah operasional
            </p>
          </div>
        </div>
        <div className="border-t border-[#f1f5f9] p-6 space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[#0f172a]">
              Alamat Lengkap <span className="text-[#dc2626]">*</span>
            </Label>
            <Textarea
              name="alamat"
              value={values.alamat}
              onChange={(e) => update("alamat", e.target.value)}
              className="border-[#cbd5e1] text-sm focus:border-[#0f766e] focus:ring-[#0f766e]/10"
              rows={3}
            />
            <p className="text-[11px] text-[#64748b]">
              Tuliskan nama jalan dan nomor fisik gedung secara jelas untuk pemetaan dapodik.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">Provinsi</Label>
              <Input
                value={values.provinsi}
                onChange={(e) => update("provinsi", e.target.value)}
                placeholder="Opsional"
                className="h-10 border-[#cbd5e1] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">Kota / Kabupaten</Label>
              <Input
                value={values.kota}
                onChange={(e) => update("kota", e.target.value)}
                placeholder="Opsional"
                className="h-10 border-[#cbd5e1] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">Kecamatan</Label>
              <Input
                value={values.kecamatan}
                onChange={(e) => update("kecamatan", e.target.value)}
                placeholder="Opsional"
                className="h-10 border-[#cbd5e1] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">Kelurahan / Desa</Label>
              <Input
                value={values.kelurahan}
                onChange={(e) => update("kelurahan", e.target.value)}
                placeholder="Opsional"
                className="h-10 border-[#cbd5e1] text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#0f172a]">Kode Pos</Label>
              <Input
                value={values.kode_pos}
                onChange={(e) => update("kode_pos", e.target.value)}
                placeholder="Opsional"
                className="h-10 border-[#cbd5e1] text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex flex-col gap-4 rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-[0_1px_3px_0_rgba(15,118,110,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <Shield className="mt-0.5 h-5 w-5 text-[#0f766e] sm:mt-0" />
          <p className="text-[11px] text-[#64748b]">
            <strong className="font-semibold text-[#0f172a]">Integritas Data Lembaga:</strong> Setiap pembaruan profil akan dicatat ke dalam log audit resmi kearsipan sekolah.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 rounded-lg border-[#cbd5e1] text-sm font-semibold text-[#334155] shadow-sm hover:bg-[#f8fafc] hover:text-[#0f766e]"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-10 rounded-lg bg-[#0f766e] px-6 text-sm font-semibold text-white shadow hover:bg-[#115e59]"
          >
            {isSubmitting ? (
              "Menyimpan..."
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function SchoolProfilePageView({
  school,
  isSuperAdmin,
}: {
  school: School;
  isSuperAdmin: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <SchoolProfileEditView
        school={school}
        onCancel={() => setIsEditing(false)}
        onSaved={() => {
          setIsEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full space-y-6 pb-12 font-sans">
      {/* HEADER CARD */}
      <div className="flex items-center justify-between rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-[0_1px_3px_0_rgba(15,118,110,0.04)]">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#eff4ff] text-[#0f766e]">
            <GraduationCap className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0f766e]">
              Profil Sekolah
            </p>
            <h1 className="font-heading text-2xl font-bold text-[#0b1c30]">
              Profil Sekolah
            </h1>
            <p className="mt-0.5 text-sm text-[#64748b]">
              Perbarui data identitas dan kontak sekolah Anda.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsEditing(true)}
          className="h-10 rounded-lg bg-[#0f766e] px-4 font-semibold text-white shadow hover:bg-[#115e59]"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Ubah Profil
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* IDENTITAS POKOK */}
        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_3px_0_rgba(15,118,110,0.04)] lg:col-span-8">
          <div className="flex items-center gap-3 px-6 py-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0fdf4] text-[#0f766e]">
              <IdCard className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-[#0f172a]">
              Data Identitas Pokok
            </h2>
          </div>
          <div className="border-t border-[#f1f5f9] p-6 space-y-4">
            <FieldBox label="Nama Sekolah" value={school.name} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldBox
                label="NPSN"
                value={school.npsn}
                actionIcon={Copy}
              />
              <FieldBox label="NIS / NSS / NDS" value={school.nis_nss_nds} />
            </div>
            <FieldBox
              label="Dinas"
              value={school.dinas}
              placeholder="— (Tidak ada data kementerian/dinas terdaftar)"
            />
            <div className="flex items-center justify-between rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-[0_1px_3px_0_rgba(15,118,110,0.02)]">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border ${
                    school.has_double_sessions
                      ? "border-[#0f766e] bg-[#0f766e] text-white"
                      : "border-[#cbd5e1] bg-white"
                  }`}
                >
                  {school.has_double_sessions && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">
                    Aktifkan sesi ganda (pagi / siang)
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#64748b]">
                    Status operasional shift sekolah reguler satu sesi
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                {school.has_double_sessions ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>

        {/* KONTAK & MEDIA */}
        <div className="rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_3px_0_rgba(15,118,110,0.04)] lg:col-span-4">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eff6ff] text-[#0284c7]">
                <AtSign className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Kontak & Media
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a7f3d0] bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-semibold text-[#065f46]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]"></span>
              Terhubung
            </span>
          </div>
          <div className="border-t border-[#f1f5f9] p-6 space-y-4">
            <FieldBox
              label="E-mail Resmi"
              value={school.email}
              icon={Mail}
              actionIcon={ExternalLink}
            />
            <FieldBox
              label="Nomor Telepon Kantor"
              value={school.phone}
              icon={Phone}
              actionIcon={PhoneCall}
            />
            <FieldBox
              label="Website Lembaga"
              value={school.website}
              icon={Globe}
              badge={
                <span className="text-[10px] font-medium text-[#94a3b8]">
                  Portal Web
                </span>
              }
            />
          </div>
        </div>
      </div>

      {/* LOKASI & ALAMAT */}
      <div className="rounded-[16px] border border-[#e2e8f0] bg-[#ffffff] shadow-[0_1px_3px_0_rgba(15,118,110,0.04)]">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fef2f2] text-[#dc2626]">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#0f172a]">
                Lokasi & Alamat Sekolah
              </h2>
              <p className="text-[11px] text-[#64748b]">
                Titik administratif lembaga pendidikan
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#cbd5e1] bg-[#f8fafc] px-3 py-1 text-[11px] font-medium text-[#475569]">
            Wilayah Administrasi: {school.provinsi || "—"} / {school.kota || "—"}
          </span>
        </div>
        <div className="border-t border-[#f1f5f9] p-6 space-y-4">
          <FieldBox
            label="Alamat Lengkap"
            value={school.address}
            icon={MapPin}
            badge={
              <span className="text-[11px] font-medium text-[#0f766e]">
                Gedung Utama
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <FieldBox label="Provinsi" value={school.provinsi} />
            <FieldBox label="Kota / Kabupaten" value={school.kota} />
            <FieldBox label="Kecamatan" value={school.kecamatan} />
            <FieldBox label="Kelurahan / Desa" value={school.kelurahan} />
            <FieldBox label="Kode Pos" value={school.kode_pos} />
          </div>
        </div>
      </div>
    </div>
  );
}
