"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, FileText } from "lucide-react";
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
import { runGenerateInvoices } from "./actions";
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
  invoices,
  billingRuns,
  canManage,
}: {
  academicYears: AcademicYear[];
  invoices: Invoice[];
  billingRuns: BillingRunLog[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [runOpen, setRunOpen] = useState(false);

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
          <Button className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]" onClick={() => setRunOpen(true)}>
            <PlusIcon data-icon="inline-start" className="size-4" />
            Generate Tagihan
          </Button>
        ) : null}
      </div>

      {/* Generate Dialog */}
      <GenerateInvoicesDialog
        open={runOpen}
        onOpenChange={setRunOpen}
        yearOptions={yearOptions}
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
        <CardHeader>
          <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Daftar Tagihan</CardTitle>
          <CardDescription className="text-[11px] text-[#8b9f95]">{invoices.length} tagihan tersedia</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
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
              emptyLabel="Belum ada tagihan. Jalankan job generate tagihan untuk membuat tagihan otomatis."
              filteredEmptyLabel="Tidak ada tagihan yang cocok dengan pencarian."
              columns={[
                { key: "period", label: "Periode", searchable: true, searchValue: (invoice) => invoice.period_label, sortValue: (invoice) => invoice.period_label, sticky: true, render: (invoice) => <span className="block truncate text-[12px] font-semibold text-[#2b493e]" title={invoice.period_label}>{invoice.period_label}</span> },
                { key: "student", label: "Siswa", searchable: true, searchValue: (invoice) => invoice.student_id, sortValue: (invoice) => invoice.student_id, render: (invoice) => <span className="block truncate text-xs text-[#3e5c50]" title={invoice.student_id}>#{invoice.student_id}</span> },
                { key: "due_date", label: "Jatuh Tempo", sortValue: (invoice) => invoice.due_date, render: (invoice) => <span className="text-xs text-[#3e5c50]">{invoice.due_date?.slice(0, 10) ?? "-"}</span> },
                { key: "total", label: "Total", sortValue: (invoice) => Number(invoice.total_amount), render: (invoice) => <span className="text-xs font-semibold text-[#2b493e]">{formatRupiah(Number(invoice.total_amount))}</span> },
                { key: "status", label: "Status", sortValue: (invoice) => invoice.status, render: (invoice) => <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge> },
              ]}
              onRowClick={(invoice) => setViewingInvoice(invoice)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewingInvoice)} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] p-0">
          <DialogHeader className="border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Keuangan</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Tagihan</DialogTitle>
            <DialogDescription>{viewingInvoice?.period_label ?? "-"}</DialogDescription>
          </DialogHeader>
          {viewingInvoice ? (
            <dl className="grid grid-cols-2 gap-x-5 gap-y-4 px-7 py-6">
              <DetailItem label="Siswa" value={`#${viewingInvoice.student_id}`} />
              <DetailItem label="Status" value={STATUS_LABELS[viewingInvoice.status]} />
              <DetailItem label="Tanggal Terbit" value={viewingInvoice.issue_date?.slice(0, 10) ?? "-"} />
              <DetailItem label="Jatuh Tempo" value={viewingInvoice.due_date?.slice(0, 10) ?? "-"} />
              <DetailItem label="Total" value={formatRupiah(Number(viewingInvoice.total_amount))} />
            </dl>
          ) : null}
          <DialogFooter className="border-t border-[#e3ece6] bg-white px-7 py-[15px]">
            <Button variant="outline" onClick={() => setViewingInvoice(null)}>Tutup</Button>
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
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  yearOptions: AcademicYear[];
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[650px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="space-y-4">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <DialogTitle className="text-[21px] font-semibold tracking-[-.05em] text-[#183d32]">Generate Tagihan Otomatis</DialogTitle>
            <DialogDescription>
              Buat tagihan untuk semua siswa yang terdaftar pada tahun ajaran ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <FieldLabel htmlFor="academic_year_id" required>Tahun Ajaran</FieldLabel>
            <Select name="academic_year_id" required>
              <SelectTrigger id="academic_year_id"><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="period_label" required>Periode Tagihan</FieldLabel>
            <Input id="period_label" name="period_label" placeholder="Sep 2025 / Bulanan" required />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="due_date" required>Tanggal Jatuh Tempo</FieldLabel>
            <Input id="due_date" name="due_date" type="date" required />
          </div>

          <FieldLabel htmlFor="only_without_invoice" optional>
            <Checkbox id="only_without_invoice" name="only_without_invoice" value="on" className="rounded border-gray-300" />
            Hanya siswa yang belum punya tagihan (idempotent)
          </FieldLabel>

          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Generate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
