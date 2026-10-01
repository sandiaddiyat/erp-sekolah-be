"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
            <div className="divide-y">
              {invoices.map((inv) => {
                const badge = STATUS_BADGE[inv.status];
                return (
                  <div key={inv.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{studentName(inv.student_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.period_label} · Jatuh tempo {inv.due_date?.slice(0, 10) ?? "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium">{formatRupiah(inv.total_amount)}</span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {permissions.canManage ? (
                        <div className="flex gap-1 ml-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(inv)}>
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Select onValueChange={() => handleStatusUpdate(inv)}>
                            <SelectTrigger className="h-8 w-[100px] rounded-[8px] border-[#d7e6dc] text-[10px] text-[#4b8669]">
                              <SelectValue placeholder="Ubah" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
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
