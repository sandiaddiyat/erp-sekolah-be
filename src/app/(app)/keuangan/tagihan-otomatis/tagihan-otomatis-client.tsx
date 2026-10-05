"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, FileText, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRupiah } from "@/lib/utils";
import type { AcademicYear, Invoice, BillingRunLog } from "@/lib/types";
import { runGenerateInvoices, runDeleteInvoice, runBulkDeleteInvoice } from "./actions";
import { FinanceDataTable } from "@/components/finance/finance-data-table";

type FormState = { error?: string; success?: string } | undefined;

const STATUS_VARIANT: Record<Invoice["status"], "default" | "secondary" | "destructive" | "outline"> = {
  belum_bayar: "default",
  sebagian: "secondary",
  lunas: "outline",
  batal: "destructive",
};

const STATUS_LABELS: Record<Invoice["status"], string> = {
  belum_bayar: "Belum Bayar",
  sebagian: "SeBagian",
  lunas: "Lunas",
  batal: "Batal",
};

export function TagihanOtomatisClient({
  academicYears,
  feeCategories,
  invoices,
  billingRuns,
  canManage,
}: {
  academicYears: AcademicYear[];
  feeCategories: { id: string; name: string }[];
  invoices: Invoice[];
  billingRuns: BillingRunLog[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [deleteState, deleteAction, isDeleting] = useActionState<FormState, FormData>(runDeleteInvoice, undefined);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkDeleteState, bulkDeleteAction, isBulkDeleting] = useActionState<FormState, FormData>(runBulkDeleteInvoice, undefined);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    if (bulkDeleteState?.success) {
      toast.success(bulkDeleteState.success);
      setSelectedKeys(new Set());
      setBulkDeleteConfirm(false);
    } else if (bulkDeleteState?.error) {
      toast.error(bulkDeleteState.error);
    }
  }, [bulkDeleteState]);

  useEffect(() => {
    if (deleteState?.success) {
      toast.success(deleteState.success);
      setViewingInvoice(null);
      setDeleteConfirm(false);
    } else if (deleteState?.error) {
      toast.error(deleteState.error);
    }
  }, [deleteState]);

  const openGenerateDialog = () => {
    setDialogKey((k) => k + 1);
    setRunOpen(true);
  };

  const activeYears = academicYears.filter((y) => y.status === "active");
  const yearOptions = activeYears.length > 0 ? activeYears : academicYears;

  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">Tagihan Otomatis</h1>
          <p className="mt-2 text-xs text-[#82978d]">Generate tagihan berdasarkan skema biaya dan data akademik.</p>
        </div>
        {canManage ? (
          <Button className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]" onClick={openGenerateDialog}>
            <PlusIcon data-icon="inline-start" className="size-4" />
            Generate Tagihan
          </Button>
        ) : null}
      </div>

      {/* Generate Dialog */}
      <GenerateInvoicesDialog
        key={`generate-dialog-${dialogKey}`}
        open={runOpen}
        onOpenChange={setRunOpen}
        yearOptions={yearOptions}
        feeCategories={feeCategories}
        onSaved={() => setRunOpen(false)}
      />

      {/* Billing Run Logs */}
      <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
        <CardHeader>
          <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Riwayat Job Billing</CardTitle>
          <CardDescription className="text-[11px] text-[#8b9f95]">{billingRuns.length} job pernah dijalankan</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {billingRuns.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Belum ada job billing yang dijalankan.
            </div>
          ) : (
            <div className="divide-y">
              {billingRuns.map((log) => (
                <div key={log.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                  <div>
                    <p className="text-sm font-medium">{log.period_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.run_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${
                      log.status === "selesai" ? "text-[#2b7254]" :
                      log.status === "gagal" ? "text-[#ad685d]" :
                      "text-[#3a7591]"
                    }`}>
                      {log.status === "selesai" ? "Selesai" : log.status === "gagal" ? "Gagal" : "Berjalan"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.total_invoices_generated} invoice
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Daftar Tagihan</CardTitle>
            <CardDescription className="text-[11px] text-[#8b9f95]">{invoices.length} tagihan tersedia</CardDescription>
          </div>
          {selectedKeys.size > 0 && canManage && (
            <form action={bulkDeleteAction}>
              {Array.from(selectedKeys).map((id) => (
                <input key={id} type="hidden" name="ids" value={id} />
              ))}
              {bulkDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground mr-2">{selectedKeys.size} tagihan dipilih</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setBulkDeleteConfirm(false)}
                    disabled={isBulkDeleting}
                    className="h-8 rounded-[9px] px-2.5 text-[10px] font-bold"
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    variant="destructive" 
                    disabled={isBulkDeleting}
                    className="h-8 rounded-[9px] px-2.5 text-[10px] font-bold"
                  >
                    {isBulkDeleting ? "Menghapus..." : "Ya, Hapus Terpilih"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#537467] font-medium">{selectedKeys.size} tagihan dipilih</span>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setBulkDeleteConfirm(true)}
                    className="h-8 rounded-[9px] border-[#ffd5d5] bg-[#fff5f5] px-2.5 text-[10px] font-bold text-[#c23a3a] shadow-none hover:border-[#ffbaba] hover:bg-[#ffebeb]"
                  >
                    <Trash2Icon className="mr-1.5 size-3" />
                    Hapus Terpilih
                  </Button>
                </div>
              )}
            </form>
          )}
        </CardHeader>
        <CardContent className="px-0 pt-6">
          {invoices.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">Belum ada tagihan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Jalankan job generate tagihan untuk membuat tagihan otomatis.
              </p>
            </div>
          ) : (
            <FinanceDataTable
              rows={invoices}
              rowKey={(invoice) => invoice.id}
              search={query}
              onSearchChange={setQuery}
              showColumnToggle={false}
              toolbarClassName="px-6"
              emptyLabel="Belum ada tagihan. Jalankan job generate tagihan untuk membuat tagihan otomatis."
              filteredEmptyLabel="Tidak ada tagihan yang cocok dengan pencarian."
              columns={[
                { key: "period", label: "Periode", searchable: true, searchValue: (invoice) => invoice.period_label, sortValue: (invoice) => invoice.period_label, sticky: true, render: (invoice) => <span className="block truncate text-[12px] font-semibold text-[#2b493e]" title={invoice.period_label}>{invoice.period_label}</span> },
                { key: "student", label: "Siswa", searchable: true, searchValue: (invoice) => invoice.students?.nama_lengkap ?? invoice.student_id, sortValue: (invoice) => invoice.students?.nama_lengkap ?? invoice.student_id, render: (invoice) => <span className="block truncate text-xs text-[#3e5c50] font-medium" title={invoice.students?.nama_lengkap ?? invoice.student_id}>{invoice.students?.nama_lengkap ?? `#${invoice.student_id.substring(0, 8)}`}</span> },
                { key: "due_date", label: "Jatuh Tempo", sortValue: (invoice) => invoice.due_date, render: (invoice) => <span className="text-xs text-[#3e5c50]">{invoice.due_date?.slice(0, 10) ?? "-"}</span> },
                { key: "total", label: "Total", sortValue: (invoice) => Number(invoice.total_amount), render: (invoice) => <span className="text-xs font-semibold text-[#2b493e]">{formatRupiah(Number(invoice.total_amount))}</span> },
                { key: "status", label: "Status", sortValue: (invoice) => invoice.status, render: (invoice) => <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge> },
              ]}
              onRowClick={(invoice) => setViewingInvoice(invoice)}
              selectable={true}
              selectedKeys={selectedKeys}
              onSelectedKeysChange={setSelectedKeys}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewingInvoice)} onOpenChange={(open) => {
        if (!open) {
          setViewingInvoice(null);
          setDeleteConfirm(false);
        }
      }}>
        <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] p-0">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Keuangan</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Tagihan</DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">{viewingInvoice?.period_label ?? "-"}</DialogDescription>
          </DialogHeader>
          {viewingInvoice ? (
            <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                <DetailItem label="Siswa" value={viewingInvoice.students?.nama_lengkap ?? `#${viewingInvoice.student_id}`} />
                <DetailItem label="Status" value={STATUS_LABELS[viewingInvoice.status]} />
                <DetailItem label="Tanggal Terbit" value={viewingInvoice.issue_date?.slice(0, 10) ?? "-"} />
                <DetailItem label="Jatuh Tempo" value={viewingInvoice.due_date?.slice(0, 10) ?? "-"} />
                <DetailItem label="Total" value={formatRupiah(Number(viewingInvoice.total_amount))} />
              </dl>
              
              {viewingInvoice.invoice_details && viewingInvoice.invoice_details.length > 0 && (
                <div className="mt-6 border-t border-[#e5eee8] pt-4">
                  <h4 className="text-[11px] font-bold tracking-[.04em] text-[#8b9f95] uppercase mb-3">Rincian Tagihan</h4>
                  <div className="space-y-2">
                    {viewingInvoice.invoice_details.map((detail) => (
                      <div key={detail.id} className="flex justify-between items-center text-xs">
                        <span className="text-[#3e5c50]">{detail.description || "Biaya Lainnya"}</span>
                        <div className="flex flex-col items-end">
                          {Number(detail.discount_amount) > 0 ? (
                            <>
                              <span className="text-[10px] text-muted-foreground line-through">{formatRupiah(Number(detail.base_amount))}</span>
                              <span className="font-semibold text-[#2b493e]">{formatRupiah(Number(detail.final_amount))}</span>
                            </>
                          ) : (
                            <span className="font-semibold text-[#2b493e]">{formatRupiah(Number(detail.final_amount))}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 pt-[15px] pb-7">
            <div className="flex w-full justify-between gap-2">
              <form action={deleteAction}>
                <input type="hidden" name="id" value={viewingInvoice?.id ?? ""} />
                {canManage && viewingInvoice?.status === "belum_bayar" ? (
                  deleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setDeleteConfirm(false)}
                        disabled={isDeleting}
                        className="h-8 rounded-[9px] px-2.5 text-[10px] font-bold"
                      >
                        Batal
                      </Button>
                      <Button 
                        type="submit" 
                        variant="destructive" 
                        disabled={isDeleting}
                        className="h-8 rounded-[9px] px-2.5 text-[10px] font-bold"
                      >
                        {isDeleting ? "Menghapus..." : "Ya, Hapus"}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDeleteConfirm(true)}
                      className="h-8 rounded-[9px] border-[#ffd5d5] bg-[#fff5f5] px-2.5 text-[10px] font-bold text-[#c23a3a] shadow-none hover:border-[#ffbaba] hover:bg-[#ffebeb]"
                    >
                      <Trash2Icon className="mr-1.5 size-3" />
                      Hapus Tagihan
                    </Button>
                  )
                ) : <div />}
              </form>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setViewingInvoice(null);
                  setDeleteConfirm(false);
                }}
                className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
              >
                Tutup
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[.04em] text-[#8b9f95] uppercase">{label}</dt>
      <dd className="mt-1 truncate text-xs text-[#2b493e]" title={value}>{value}</dd>
    </div>
  );
}

function GenerateInvoicesDialog({
  open,
  onOpenChange,
  yearOptions,
  feeCategories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearOptions: AcademicYear[];
  feeCategories: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(runGenerateInvoices, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onSaved]);

  const FORM_INPUT_CLASS = "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Keuangan</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Generate Tagihan Otomatis</DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              Buat tagihan untuk semua siswa yang terdaftar pada tahun ajaran ini.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-2">
              <FieldLabel htmlFor="academic_year_id" required>Tahun Ajaran</FieldLabel>
              <Select name="academic_year_id" required>
                <SelectTrigger id="academic_year_id" className={FORM_INPUT_CLASS}>
                  <SelectValue placeholder="Pilih tahun ajaran">
                    {(val: string) => {
                      if (!val) return "Pilih tahun ajaran";
                      const y = yearOptions.find((opt) => opt.id === val);
                      return y ? y.name : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="period_label" required>Periode Tagihan</FieldLabel>
              <Input id="period_label" name="period_label" placeholder="Contoh: Sep 2025 / Bulanan" required className={FORM_INPUT_CLASS} />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="due_date" required>Tanggal Jatuh Tempo</FieldLabel>
              <Input id="due_date" name="due_date" type="date" required className={FORM_INPUT_CLASS} />
            </div>

            <div className="space-y-2">
              <FieldLabel required>Pilih Kategori Biaya</FieldLabel>
              <div className="grid grid-cols-2 gap-3 mt-2 rounded-[10px] border border-[#e5eee8] bg-[#fcfdfc] p-4 shadow-sm">
                {feeCategories.length === 0 ? (
                  <p className="text-[11px] text-[#8b9f95] col-span-2">Tidak ada kategori biaya yang terdaftar.</p>
                ) : (
                  feeCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox 
                        id={`cat-${cat.id}`} 
                        name="fee_category_ids" 
                        value={cat.id} 
                        defaultChecked
                        className="rounded-[4px] border-[#c0cfc6] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743] text-white h-4 w-4" 
                      />
                      <label htmlFor={`cat-${cat.id}`} className="text-[11px] font-medium leading-relaxed text-[#36584a] cursor-pointer select-none">
                        {cat.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex items-start gap-3 rounded-[10px] border border-[#e5eee8] bg-[#fcfdfc] p-4 shadow-sm">
              <Checkbox id="only_without_invoice" name="only_without_invoice" value="on" className="mt-0.5 rounded-[4px] border-[#c0cfc6] data-[state=checked]:bg-[#185743] data-[state=checked]:border-[#185743] text-white" />
              <label htmlFor="only_without_invoice" className="text-[11px] font-semibold leading-relaxed text-[#36584a] cursor-pointer select-none">
                Hanya siswa yang belum punya tagihan<br/>
                <span className="font-normal text-[#8b9f95]">Mencegah duplikasi tagihan pada siswa yang sama.</span>
              </label>
            </div>
          </div>

          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 pt-[15px] pb-7">
            <div className="flex w-full justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]">
                {isSubmitting ? "Memproses..." : "Generate Tagihan"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
