"use client";

import { useState } from "react";
import { EyeIcon, CheckIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

  const [statusState, statusAction, statusSubmitting] = useActionState<FormState, FormData>(updateInvoiceStatus, undefined);

  const invoiceDetails = selectedInvoice
    ? details.filter((d) => d.invoice_id === selectedInvoice.id)
    : [];

  const studentName = (studentId: string) =>
    students.find((s) => s.id === studentId)?.nama_lengkap ?? studentId;

  const handleStatusUpdate = (invoice: Invoice, newStatus: Invoice["status"]) => {
    setEditingInvoice(invoice);
    setStatusFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Invoice / Tagihan Siswa</h1>
        <p className="text-sm text-muted-foreground">
          Daftar invoice yang dibuat otomatis dari billing run.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Invoice</CardTitle>
          <CardDescription>{invoices.length} invoice</CardDescription>
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
                  <div key={inv.id} className="flex items-center justify-between gap-3 px-6 py-3">
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
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleStatusUpdate(inv, e.target.value as Invoice["status"]);
                            }}
                            className="text-xs border rounded px-1 py-0.5 bg-transparent"
                          >
                            <option value="" disabled>Ubah</option>
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Invoice</DialogTitle>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={statusFormOpen} onOpenChange={setStatusFormOpen}>
        <DialogContent className="sm:max-w-md">
          <form action={statusAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Ubah Status Invoice</DialogTitle>
              <DialogDescription>
                {editingInvoice && studentName(editingInvoice.student_id)} · {formatRupiah(editingInvoice?.total_amount ?? 0)}
              </DialogDescription>
            </DialogHeader>

            {editingInvoice ? <input type="hidden" name="id" value={editingInvoice.id} /> : null}

            <div className="space-y-2">
              <FieldLabel htmlFor="status" required>Status Baru</FieldLabel>
              <Select name="status" defaultValue={editingInvoice?.status ?? ""}>
                <SelectTrigger id="status"><SelectValue placeholder="Pilih status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={statusSubmitting}>{statusSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
