"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FormState, ReceiptTemplate } from "@/lib/types";
import { saveReceiptTemplate } from "@/features/receipt-templates/actions";

const PRIMARY_BUTTON =
  "h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]";
const OUTLINE_BUTTON =
  "h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]";

interface TemplateConfig {
  paperSize: "a5-landscape" | "a4" | "thermal";
  showLogo: boolean;
  showAddress: boolean;
  showDoubleBorder: boolean;
  activeTags: string[];
  signatureModel: "1-col" | "2-col" | "3-col";
  showQrCode: boolean;
  footerNote: string;
  watermarkLogo: boolean;
  separatorStyle: "dashed" | "double" | "solid";
  accentBar: boolean;
  showTerbilang: boolean;
  showDiskon: boolean;
  showKelasJurusan: boolean;
  showMetode: boolean;
  showPetugas: boolean;
  showNis: boolean;
  showKeterangan: boolean;
  showVirtualRef: boolean;
  showWaliPhone: boolean;
  showStampPaid: boolean;
}

const DEFAULT_TAGS = [
  "no-kuitansi",
  "tanggal",
  "nama-siswa",
  "nis-nisn",
  "kelas-jurusan",
  "metode-pembayaran",
  "petugas",
];

const ALL_TAGS = [
  { id: "no-kuitansi", label: "No. Kuitansi" },
  { id: "tanggal", label: "Tanggal Bayar" },
  { id: "nama-siswa", label: "Nama Siswa" },
  { id: "nis-nisn", label: "NIS / NISN" },
  { id: "kelas-jurusan", label: "Kelas & Jurusan" },
  { id: "metode-pembayaran", label: "Metode Pembayaran" },
  { id: "petugas", label: "Petugas Kasir / TU" },
  { id: "va-ref", label: "Virtual Account Ref" },
  { id: "wali-phone", label: "No. Telepon Wali" },
];

const COLUMNS = [
  { id: "no-deskripsi", label: "Kolom 1: No & Deskripsi Tagihan", locked: true },
  { id: "periode", label: "Kolom 2: Periode / Bulan", locked: false },
  { id: "nominal", label: "Kolom 3: Nominal / Jumlah (Rp)", locked: true },
  { id: "keterangan", label: "Kolom 4: Keterangan / Status", locked: false },
];

export function VisualBuilderDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ReceiptTemplate | null;
}) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(saveReceiptTemplate, undefined);
  const [templateName, setTemplateName] = useState(editing?.name ?? "Kuitansi SPP & Kegiatan");
  const [isDefault, setIsDefault] = useState(editing?.is_default ?? false);

  const [config, setConfig] = useState<TemplateConfig>({
    paperSize: "a5-landscape",
    showLogo: true,
    showAddress: true,
    showDoubleBorder: true,
    activeTags: DEFAULT_TAGS,
    signatureModel: "2-col",
    showQrCode: true,
    footerNote:
      "Bukti pembayaran ini sah dan diterbitkan secara resmi oleh Sistem Keuangan Sekolah. Harap disimpan sebagai bukti transaksi yang valid.",
    watermarkLogo: true,
    separatorStyle: "dashed",
    accentBar: true,
    showTerbilang: true,
    showDiskon: true,
    showKelasJurusan: true,
    showMetode: true,
    showPetugas: true,
    showNis: true,
    showKeterangan: true,
    showVirtualRef: false,
    showWaliPhone: false,
    showStampPaid: true,
  });

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    }
    if (state?.error) toast.error(state.error);
  }, [state, onOpenChange]);

  useEffect(() => {
    if (editing) {
      setTemplateName(editing.name);
      setIsDefault(editing.is_default);
    } else {
      setTemplateName("Kuitansi SPP & Kegiatan");
      setIsDefault(false);
    }
  }, [editing]);

  const toggleTag = (tagId: string) => {
    setConfig((prev) => {
      if (prev.activeTags.includes(tagId)) {
        return { ...prev, activeTags: prev.activeTags.filter((t) => t !== tagId) };
      }
      return { ...prev, activeTags: [...prev.activeTags, tagId] };
    });
  };

  const previewHtml = useMemo(() => generatePreviewHtml(config), [config]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100%-2rem)] max-w-[1440px] sm:max-w-[1440px] flex-col overflow-hidden rounded-[15px] border-[#e2ece5] bg-[#fbfdfb] p-0">
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          {editing?.id && <input type="hidden" name="id" value={editing.id} />}
          <input type="hidden" name="name" value={templateName} />
          <input type="hidden" name="is_default" value={isDefault ? "on" : ""} />
          <input type="hidden" name="content_html" value={previewHtml} />
          <input type="hidden" name="content_css" value="" />

          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-6 py-4 text-[#183d32]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f3ea] text-[#185743]">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c9a77]">
                    <span>Keuangan • Pengaturan Kuitansi</span>
                    <span className="text-[#b7c9bf]">/</span>
                    <span className="text-[#6b8477]">Visual Builder (No-Code)</span>
                  </div>
                  <DialogTitle className="font-heading text-lg font-bold tracking-[-0.02em] text-[#183d32]">
                    {editing ? "Ubah Template Bukti Pembayaran" : "Buat Template Bukti Pembayaran"}
                  </DialogTitle>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-lg border border-[#e1ebe4] bg-[#f8fbf9] px-3 py-1.5">
                  <span className="text-[11px] font-medium text-[#537467]" id="receipt-template-name-label">Nama Template:</span>
                  <Input
                    id="receipt-template-name-field"
                    name="receipt-template-name-field"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-7 w-64 border-0 bg-transparent p-0 text-[11px] font-medium text-[#183d32] shadow-none focus-visible:ring-0"
                    required
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px] font-medium text-[#537467]">
                  <Checkbox
                    checked={isDefault}
                    onCheckedChange={(checked) => setIsDefault(checked === true)}
                    className="border-[#b8d6c0] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743]"
                  />
                  Jadikan template utama
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-[#82978d] hover:bg-[#f4faf5] hover:text-[#183d32]"
                  onClick={() => onOpenChange(false)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="flex w-[43%] min-h-0 flex-col overflow-hidden border-r border-[#e5eee8] bg-[#f8fbf9]">
              <div className="flex items-center justify-between border-b border-[#e5eee8] bg-white px-5 py-3">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#537467]">
                    Komponen & Pengaturan Cetak
                  </h2>
                  <p className="text-[11px] text-[#82978d]">Sesuaikan tata letak kuitansi tanpa syntax HTML/CSS</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-[#e7f3ea] px-2 py-0.5 text-[10px] font-semibold text-[#2b7254]">
                  Auto-Sync Aktif
                </span>
              </div>
              <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
                <ControlSection title="Ukuran & Format Kertas">
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "a5-landscape", label: "A5 Landscape", desc: "210 x 148 mm" },
                      { value: "a4", label: "A4 2-Rangkap", desc: "Continuous / Folio" },
                      { value: "thermal", label: "Termal 80mm", desc: "Struk Kasir Cepat" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, paperSize: item.value as any }))}
                        className={`rounded-lg border p-2.5 text-left transition ${
                          config.paperSize === item.value
                            ? "border-[#185743] bg-[#e7f3ea]/60 text-[#185743]"
                            : "border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0]"
                        }`}
                      >
                        <span className="block text-[11px] font-bold">{item.label}</span>
                        <span className="text-[10px] text-[#6b8477]">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </ControlSection>

                <ControlSection title="Kop Surat & Identitas Sekolah">
                  <div className="space-y-2.5 text-[11px] text-[#537467]">
                    <ToggleRow
                      label="Tampilkan Logo Sekolah"
                      checked={config.showLogo}
                      onChange={(v) => setConfig((prev) => ({ ...prev, showLogo: v }))}
                    />
                    <ToggleRow
                      label="Alamat Lengkap & Kontak"
                      checked={config.showAddress}
                      onChange={(v) => setConfig((prev) => ({ ...prev, showAddress: v }))}
                    />
                    <ToggleRow
                      label="Garis Ganda Pembatas Kop"
                      checked={config.showDoubleBorder}
                      onChange={(v) => setConfig((prev) => ({ ...prev, showDoubleBorder: v }))}
                    />
                  </div>
                </ControlSection>

                <ControlSection title="Atribut Kuitansi yang Dicetak">
                  <p className="text-[11px] text-[#6b8477]">
                    Klik tag untuk mengaktifkan atau menonaktifkan tampilan pada kuitansi:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS.map((tag) => {
                      const active = config.activeTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium transition ${
                            active
                              ? "border-[#b8d6c0] bg-[#e7f3ea] text-[#2b7254]"
                              : "border-[#e1ebe4] bg-white text-[#6b8477] hover:bg-[#f4faf5]"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {tag.label}
                        </button>
                      );
                    })}
                  </div>
                </ControlSection>

                <ControlSection title="Struktur Tabel Rincian & Kalkulasi">
                  <div className="space-y-1.5 text-[11px]">
                    {COLUMNS.map((col) => (
                      <div
                        key={col.id}
                        className="flex items-center justify-between rounded border border-[#e1ebe4] bg-white p-2"
                      >
                        <div className="flex items-center gap-2 text-[#537467]">
                          <span className="text-[#b7c9bf]">☰</span>
                          <span className="font-medium">{col.label}</span>
                        </div>
                        {col.locked ? (
                          <span className="text-[10px] font-semibold text-[#82978d]">TETAP</span>
                        ) : (
                          <Checkbox
                            checked={col.id === "periode" ? config.showTerbilang : config.showKeterangan}
                            onCheckedChange={(v) => {
                              if (col.id === "periode") setConfig((prev) => ({ ...prev, showTerbilang: v === true }));
                              else setConfig((prev) => ({ ...prev, showKeterangan: v === true }));
                            }}
                            className="border-[#b8d6c0] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743]"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 border-t border-[#f1f6f3] pt-2 text-[11px] text-[#537467]">
                    <ToggleRow
                      label='Sertakan Terbilang (Contoh: "Satu Juta...")'
                      checked={config.showTerbilang}
                      onChange={(v) => setConfig((prev) => ({ ...prev, showTerbilang: v }))}
                    />
                    <ToggleRow
                      label="Tampilkan Potongan Beasiswa / Diskon"
                      checked={config.showDiskon}
                      onChange={(v) => setConfig((prev) => ({ ...prev, showDiskon: v }))}
                    />
                  </div>
                </ControlSection>

                <ControlSection title="Pengesahan & Catatan Kaki">
                  <div className="space-y-3 text-[11px] text-[#537467]">
                    <div className="flex items-center justify-between">
                      <span>Model Tanda Tangan:</span>
                      <Select
                        value={config.signatureModel}
                        onValueChange={(v: any) => setConfig((prev) => ({ ...prev, signatureModel: v }))}
                      >
                        <SelectTrigger className="h-8 w-[220px] border-[#e1ebe4] text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2-col">2 Kolom (Penyetor & Bendahara)</SelectItem>
                          <SelectItem value="1-col">1 Kolom (Bendahara Saja)</SelectItem>
                          <SelectItem value="3-col">3 Kolom (Penyetor, Kasir, Kepala Sekolah)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ToggleRow
                      label="QR Code Verifikasi Sistem (Anti-Pemalsuan)"
                      checked={config.showQrCode}
                      onChange={(v) => setConfig((prev) => ({ ...prev, showQrCode: v }))}
                    />
                    <div>
                      <span className="block text-[11px] font-semibold text-[#6b8477]" id="receipt-template-footer-label">Catatan Kaki Resmi (Disclaimer):</span>
                      <Textarea
                        id="receipt-template-footer-field"
                        rows={2}
                        value={config.footerNote}
                        onChange={(e) => setConfig((prev) => ({ ...prev, footerNote: e.target.value }))}
                        className="mt-1 h-auto border-[#e1ebe4] text-[11px] text-[#537467]"
                      />
                    </div>
                  </div>
                </ControlSection>
              </div>
            </aside>

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f1f5f3]">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#e5eee8] bg-white px-6">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4c9a77] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#185743]" />
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#537467]">
                    Pratinjau Hasil Cetak
                  </span>
                  <span className="text-[#b7c9bf]">|</span>
                  <span className="text-[11px] text-[#6b8477]">Tabel Modern • A5 Landscape</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center overflow-hidden rounded-lg border border-[#e1ebe4] bg-[#f8fbf9] text-[11px]">
                    <button type="button" className="px-2.5 py-1 text-[#6b8477] hover:bg-[#f1f6f3]">
                      -
                    </button>
                    <span className="px-2 font-mono text-[#537467]">100%</span>
                    <button type="button" className="px-2.5 py-1 text-[#6b8477] hover:bg-[#f1f6f3]">
                      +
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-[8px] border-[#e1ebe4] bg-white text-[11px] font-semibold text-[#537467] hover:bg-[#f4faf5]"
                  >
                    Pratinjau Cetak
                  </Button>
                </div>
              </div>
              <div className="custom-scrollbar flex-1 overflow-auto p-6">
                <div className="mx-auto flex justify-center">
                  <article
                    className="relative flex min-h-[500px] w-[780px] flex-col justify-between rounded-lg border border-[#d8e6dd] bg-white p-8 text-[#1f3330] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.08),0_8px_10px_-6px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.05)]"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="shrink-0 justify-end gap-2 border-t border-[#e3ece6] bg-white px-6 py-[15px]">
            <Button type="button" variant="outline" className={OUTLINE_BUTTON} onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" className={PRIMARY_BUTTON} disabled={isPending}>
              {isPending ? "Menyimpan..." : "Simpan & Terapkan Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ControlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-[#e1ebe4] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#537467]">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-[11px] text-[#537467]">
      <span>{label}</span>
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="border-[#b8d6c0] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743]"
      />
    </label>
  );
}

function generatePreviewHtml(config: TemplateConfig): string {
  const borderClass = config.showDoubleBorder ? "border-t-4 border-b-4 border-forest" : "border-t-2 border-b-2 border-forest";
  const showNoKuitansi = config.activeTags.includes("no-kuitansi");
  const showTanggal = config.activeTags.includes("tanggal");
  const showNama = config.activeTags.includes("nama-siswa");
  const showNis = config.activeTags.includes("nis-nisn") && config.showNis;
  const showKelas = config.activeTags.includes("kelas-jurusan") && config.showKelasJurusan;
  const showMetode = config.activeTags.includes("metode-pembayaran") && config.showMetode;
  const showPetugas = config.activeTags.includes("petugas") && config.showPetugas;
  const showVa = config.activeTags.includes("va-ref") && config.showVirtualRef;
  const showWali = config.activeTags.includes("wali-phone") && config.showWaliPhone;

  const rows = [];
  if (showNoKuitansi) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">No. Kuitansi</span><span class="font-mono text-slate-800">KW-2025-XXXXXX</span></div>`);
  if (showTanggal) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">Tanggal Bayar</span><span class="text-slate-800">1 Oktober 2025</span></div>`);
  if (showNama) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">Nama Siswa</span><span class="text-slate-800">Ahmad Fauzi</span></div>`);
  if (showNis) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">NIS/NISN</span><span class="text-slate-800">12345 / 678901</span></div>`);
  if (showKelas) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">Kelas/Jurusan</span><span class="text-slate-800">VII-A</span></div>`);
  if (showMetode) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">Metode Pembayaran</span><span class="text-slate-800">Tunai</span></div>`);
  if (showPetugas) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">Petugas</span><span class="text-slate-800">Bendahara TU</span></div>`);
  if (showVa) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">VA Ref</span><span class="text-slate-800">1234567890</span></div>`);
  if (showWali) rows.push(`<div class="flex justify-between text-[11px]"><span class="font-semibold text-slate-600">No. Telp Wali</span><span class="text-slate-800">08123456789</span></div>`);

  const terbilangHtml = config.showTerbilang
    ? `<div class="mt-3 border-t border-dashed border-slate-300 pt-2 text-[11px]"><span class="font-semibold text-slate-600">Terbilang:</span> <span class="italic text-slate-700">Lima Ratus Ribu Rupiah</span></div>`
    : "";

  const keteranganCol = config.showKeterangan
    ? `<th class="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">Keterangan</th>`
    : "";
  const keteranganRow = config.showKeterangan
    ? `<td class="px-3 py-2 text-[11px] text-slate-700">Lunas</td>`
    : "";

  const signatureCols = config.signatureModel === "1-col" ? 1 : config.signatureModel === "2-col" ? 2 : 3;
  const signatureWidth = signatureCols === 1 ? "w-1/3" : signatureCols === 2 ? "w-1/2" : "w-1/3";
  let signatures = "";
  const labels = ["Penyetor", "Bendahara", "Kepala Sekolah"];
  const count = config.signatureModel === "1-col" ? 1 : config.signatureModel === "3-col" ? 3 : 2;
  for (let i = 0; i < count; i++) {
    const label = count === 1 ? "Bendahara" : labels[i];
    signatures += `
      <div class="${signatureWidth} text-center">
        <div class="mb-8"></div>
        <div class="border-t border-slate-400 pt-1 text-[11px] font-semibold text-slate-700">${label}</div>
        <div class="text-[10px] text-slate-500">(Tanda Tangan &amp; Nama Terang)</div>
      </div>
    `;
  }

  const qrHtml = config.showQrCode
    ? `<div class="absolute right-6 bottom-6 z-10"><div class="h-16 w-16 rounded border border-slate-300 bg-white flex items-center justify-center text-[8px] text-slate-400">QR</div></div>`
    : "";

  const stampHtml = config.showStampPaid
    ? `<div class="absolute right-28 top-48 z-10 -rotate-12 pointer-events-none select-none"><div class="border-4 border-dashed border-red-600/80 rounded-xl px-5 py-2 text-center bg-red-50/20"><span class="block text-xl font-black tracking-widest text-red-600 uppercase">PAID / LUNAS</span></div></div>`
    : "";

  return `<!-- BEGIN: Receipt Preview -->
<div class="relative pl-2">
  ${config.accentBar ? `<div class="absolute left-0 top-0 bottom-0 w-2 bg-[#185743] rounded-l-lg"></div>` : ""}
  ${stampHtml}
  ${qrHtml}
  <div class="flex items-center justify-between pb-3 ${borderClass}">
    <div class="flex items-center gap-3.5">
      ${config.showLogo ? `<div class="h-14 w-14 rounded-full bg-[#185743] text-white flex items-center justify-center font-bold text-lg ring-2 ring-[#185743]/20 shrink-0">SMA</div>` : ""}
      <div>
        <h2 class="text-base font-extrabold uppercase tracking-wide text-[#185743]">SMA CENDEKIA NUSANTARA</h2>
        ${config.showAddress ? `<p class="text-[11px] text-slate-500 leading-tight">Jl. Pendidikan No. 45, Kebayoran Baru, Jakarta Selatan 12160</p><p class="text-[10px] text-slate-400">Telp: (021) 789-2231 • Email: tu.keuangan@cendekia.sch.id</p>` : ""}
      </div>
    </div>
    <div class="text-right">
      <span class="inline-block rounded bg-[#185743]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#185743]">BUKTI PEMBAYARAN</span>
    </div>
  </div>

  <div class="mt-4 grid grid-cols-2 gap-6">
    <div class="space-y-1.5">${rows.join("")}</div>
  </div>

  <div class="mt-4">
    <table class="w-full border border-slate-300">
      <thead class="bg-slate-50">
        <tr>
          <th class="border-b border-slate-300 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">No</th>
          <th class="border-b border-slate-300 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">Deskripsi Tagihan</th>
          <th class="border-b border-slate-300 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-600">Nominal (Rp)</th>
          ${keteranganCol}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-700">1</td>
          <td class="border-b border-slate-200 px-3 py-2 text-[11px] text-slate-700">SPP Bulan Oktober 2025</td>
          <td class="border-b border-slate-200 px-3 py-2 text-right text-[11px] text-slate-700">Rp 500.000</td>
          ${keteranganRow}
        </tr>
        <tr class="bg-slate-50">
          <td class="px-3 py-2 text-right text-[11px] font-semibold text-slate-700" colspan="${config.showKeterangan ? 3 : 2}">Total Dibayar</td>
          <td class="px-3 py-2 text-right text-[11px] font-bold text-slate-800" colspan="1">Rp 500.000</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${terbilangHtml}

  <div class="mt-6 flex justify-end gap-4">${signatures}</div>

  <div class="mt-6 border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">${config.footerNote}</div>
</div>
<!-- END: Receipt Preview -->`;
}