"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";
import { FinanceDataTable } from "@/components/finance/finance-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { formatRupiah } from "@/lib/utils";
import type { Invoice, InvoiceDetail } from "@/lib/types";
import { updateInvoiceStatus } from "./actions";
import { useActionState } from "react";

type FormState = { error?: string; success?: string } | undefined;

const STATUS_BADGE: Record<Invoice["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  belum_bayar: { label: "Belum Bayar", variant: "destructive" },
  sebagian: { label: "Sebagian", variant: "secondary" },
  lunas: { label: "Lunas", variant: "default" },
  batal: { label: "Batal", variant: "outline" },
};

const STATUS_OPTIONS: { value: Invoice["status"]; label: string }[] = [
  { value: "belum_bayar", label: "Belum Bayar" },
  { value: "sebagian", label: "Sebagian" },
  { value: "lunas", label: "Lunas" },
  { value: "batal", label: "Batal" },
];

export function InvoiceClient({
  invoices,
  details,
  students,
  permissions,
}: {
  invoices: (Invoice & { student_nama: string | null })[];
  details: InvoiceDetail[];
  students: { id: string; nama_lengkap: string }[];
  permissions: { canManage: boolean };
}) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [query, setQuery] = useState("");
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const invoiceDetails = selectedInvoice
    ? details.filter((d) => d.invoice_id === selectedInvoice.id)
    : [];

  const studentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.nama_lengkap ?? studentId;

  const handleStatusUpdate = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setStatusFormOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div>
        <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span>
        <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">Invoice / Tagihan Siswa</h1>
        <p className="mt-2 text-xs text-[#82978d]">Daftar invoice yang dibuat otomatis dari billing run.</p>
      </div>

      <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
        <CardHeader>
          <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Daftar Invoice</CardTitle>
          <CardDescription className="text-[11px] text-[#8b9f95]">{invoices.length} invoice</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {invoices.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada invoice</p>
              <p className="text-sm text-muted-foreground mt-1">Invoice dibuat otomatis saat billing run berjalan.</p>
            </div>
          ) : (
            <FinanceDataTable
              rows={invoices}
              rowKey={(invoice) => invoice.id}
              search={query}
              onSearchChange={setQuery}
              emptyLabel="Belum ada invoice. Invoice dibuat otomatis saat billing run berjalan."
              filteredEmptyLabel="Tidak ada invoice yang cocok dengan pencarian."
              columns={[
                { key: "student", label: "Siswa", searchable: true, searchValue: (invoice) => studentName(invoice.student_id), sortValue: (invoice) => studentName(invoice.student_id), sticky: true, render: (invoice) => <span className="block truncate text-[12px] font-semibold text-[#2b493e]" title={studentName(invoice.student_id)}>{studentName(invoice.student_id)}</span> },
                { key: "period", label: "Periode", searchable: true, searchValue: (invoice) => invoice.period_label, sortValue: (invoice) => invoice.period_label, render: (invoice) => <span className="block truncate text-xs text-[#3e5c50]" title={invoice.period_label}>{invoice.period_label}</span> },
                { key: "due_date", label: "Jatuh Tempo", sortValue: (invoice) => invoice.due_date, render: (invoice) => <span className="text-xs text-[#3e5c50]">{invoice.due_date?.slice(0, 10) ?? "-"}</span> },
                { key: "total", label: "Total", sortValue: (invoice) => Number(invoice.total_amount), render: (invoice) => <span className="text-xs font-semibold text-[#2b493e]">{formatRupiah(invoice.total_amount)}</span> },
                { key: "status", label: "Status", sortValue: (invoice) => invoice.status, render: (invoice) => { const badge = STATUS_BADGE[invoice.status]; return <Badge variant={badge.variant}>{badge.label}</Badge>; } },
              ]}
              onRowClick={(invoice) => setSelectedInvoice(invoice)}
              actions={permissions.canManage ? (invoice) => (
                <Button variant="ghost" size="icon-sm" aria-label="Ubah status invoice" className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]" onClick={() => handleStatusUpdate(invoice)}><PencilIcon className="size-4" /></Button>
              ) : undefined}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[650px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <DialogTitle className="text-[21px] font-semibold tracking-[-.05em] text-[#183d32]">Detail Invoice</DialogTitle>
            <DialogDescription>
              {selectedInvoice && studentName(selectedInvoice.student_id)} · {selectedInvoice?.period_label}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="font-medium">{formatRupiah(selectedInvoice?.total_amount ?? 0)}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <Badge variant={STATUS_BADGE[selectedInvoice?.status ?? "belum_bayar"].variant}>
                {STATUS_BADGE[selectedInvoice?.status ?? "belum_bayar"].label}
              </Badge>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Diterbitkan:</span>{" "}
              {selectedInvoice?.issue_date?.slice(0, 10) ?? "-"}
            </p>
          </div>

          <FieldLabel htmlFor="detail-list">Rincian Tagihan</FieldLabel>
          <div id="detail-list" className="space-y-1 max-h-48 overflow-y-auto">
            {invoiceDetails.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada rincian.</p>
            ) : (
              invoiceDetails.map((d) => (
                <div key={d.id} className="flex justify-between text-sm">
                  <span>{d.description}</span>
                  <span className="font-medium">{formatRupiah(d.final_amount)}</span>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpdateStatusDialog
        key={editingInvoice?.id ?? "no-invoice"}
        open={statusFormOpen}
        onOpenChange={setStatusFormOpen}
        invoice={editingInvoice}
        studentName={editingInvoice ? studentName(editingInvoice.student_id) : undefined}
        onSaved={() => {
          setStatusFormOpen(false);
          setEditingInvoice(null);
        }}
      />
    </div>
  );
}

function UpdateStatusDialog({
  open,
  onOpenChange,
  invoice,
  studentName,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  studentName?: string;
  onSaved: () => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(updateInvoiceStatus, undefined);

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
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Keuangan</span>
            <DialogTitle
              className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Ubah Status Invoice
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              {studentName} · {formatRupiah(invoice?.total_amount ?? 0)}
            </DialogDescription>
          </DialogHeader>

          {invoice ? <input type="hidden" name="id" value={invoice.id} /> : null}

          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="status" required>Status Baru</FieldLabel>
              <select
                id="status"
                name="status"
                defaultValue={invoice?.status ?? ""}
                className="h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
                required
              >
                <option value="">- pilih status -</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px]">
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-[9px] border border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
