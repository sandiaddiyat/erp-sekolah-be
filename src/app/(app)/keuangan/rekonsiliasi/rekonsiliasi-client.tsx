"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah } from "@/lib/utils";
import type { Invoice, PaymentMethod, BankAccount, Siswa, InvoiceStatus } from "@/lib/types";
import { savePaymentMethod, deletePaymentMethod, saveBankAccount, deleteBankAccount, recordPaymentV2 } from "./actions";

type FormState = { error?: string; success?: string } | undefined;

type InvoiceRow = Invoice & { siswa?: { nama_lengkap: string } | null };

const STATUS_VARIANT: Record<InvoiceStatus, "default" | "secondary" | "outline" | "destructive"> = {
  belum_bayar: "destructive",
  sebagian: "secondary",
  lunas: "outline",
  batal: "default",
};

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  belum_bayar: "Belum Bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
  batal: "Batal",
};

export function RekonsiliasiClient({
  invoices,
  paidByInvoice,
  methods,
  banks,
  students,
  summary,
  canManage,
}: {
  invoices: InvoiceRow[];
  paidByInvoice: Record<string, number>;
  methods: PaymentMethod[];
  banks: BankAccount[];
  students: Siswa[];
  summary: Record<InvoiceStatus, { count: number; total: number }>;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  // Payment method state
  const [methodOpen, setMethodOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);

  // Bank account state
  const [bankOpen, setBankOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deletingBank, setDeletingBank] = useState<BankAccount | null>(null);

  // Record payment state
  const [payOpen, setPayOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceRow | null>(null);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const studentName = students.find((s) => s.id === inv.student_id)?.nama_lengkap ?? "";
      const matchesQuery = !query ||
        studentName.toLowerCase().includes(query.toLowerCase()) ||
        inv.period_label.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [invoices, students, query, statusFilter]);

  const handleDeleteMethod = (target: PaymentMethod) => {
    if (!canManage) return;
    const formData = new FormData();
    formData.append("id", target.id);
    deletePaymentMethod(undefined, formData);
    setDeletingMethod(null);
  };

  const handleDeleteBank = (target: BankAccount) => {
    if (!canManage) return;
    const formData = new FormData();
    formData.append("id", target.id);
    deleteBankAccount(undefined, formData);
    setDeletingBank(null);
  };

  const openPaymentDialog = (invoice: InvoiceRow) => {
    setPayingInvoice(invoice);
    setPayOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div>
        <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span>
        <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">Rekonsiliasi Pembayaran</h1>
        <p className="mt-2 text-xs text-[#82978d]">Rekap status tagihan dan pembayaran per periode.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="rounded-[14px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] text-[#8b9f95]">Belum Bayar</CardDescription>
            <CardTitle className="text-2xl">{summary.belum_bayar.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.belum_bayar.total)}
          </CardContent>
        </Card>
        <Card className="rounded-[14px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] text-[#8b9f95]">Sebagian</CardDescription>
            <CardTitle className="text-2xl">{summary.sebagian.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.sebagian.total)}
          </CardContent>
        </Card>
        <Card className="rounded-[14px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] text-[#8b9f95]">Lunas</CardDescription>
            <CardTitle className="text-2xl text-[#2b7254]">{summary.lunas.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.lunas.total)}
          </CardContent>
        </Card>
        <Card className="rounded-[14px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] text-[#8b9f95]">Batal</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{summary.batal.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.batal.total)}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="w-full">
        <TabsList>
          <TabsTrigger value="invoices">Daftar Tagihan</TabsTrigger>
          <TabsTrigger value="methods">Metode Pembayaran</TabsTrigger>
          <TabsTrigger value="banks">Rekening Sekolah</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari siswa / periode..." className="pl-8" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                <SelectItem value="sebagian">Sebagian</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
                <SelectItem value="batal">Batal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
            <CardHeader>
              <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Tagihan ({filteredInvoices.length})</CardTitle>
              <CardDescription className="text-[11px] text-[#8b9f95]">Status ter-update otomatis setelah pembayaran dicatat</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {filteredInvoices.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium">Tidak ada tagihan</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredInvoices.map((inv) => {
                    const paid = paidByInvoice[inv.id] ?? 0;
                    const remaining = Math.max(0, Number(inv.total_amount) - paid);
                    const student = students.find((s) => s.id === inv.student_id);
                    return (
                      <div key={inv.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{student?.nama_lengkap ?? inv.student_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.period_label} · Jatuh tempo: {inv.due_date?.slice(0, 10)}
                          </p>
                          <div className="mt-1 text-xs">
                            <span className="text-muted-foreground">Total:</span>{" "}
                            <span className="font-medium">{formatRupiah(Number(inv.total_amount))}</span>{" "}
                            <span className="text-muted-foreground">· Terbayar:</span>{" "}
                            <span className="font-medium text-[#2b7254]">{formatRupiah(paid)}</span>
                            {remaining > 0 && (
                              <>
                                {" "}
                                <span className="text-muted-foreground">· Sisa:</span>{" "}
                                <span className="font-medium text-[#ad685d]">{formatRupiah(remaining)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={STATUS_VARIANT[inv.status as InvoiceStatus]}>
                            {STATUS_LABELS[inv.status as InvoiceStatus]}
                          </Badge>
                          {canManage && remaining > 0 && (
                            <Button size="sm" onClick={() => openPaymentDialog(inv)}>
                              <Banknote className="h-3.5 w-3.5" />
                              Bayar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          {canManage && (
            <Button size="sm" onClick={() => setMethodOpen(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Tambah Metode
            </Button>
          )}
          <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
            <CardHeader>
              <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Metode Pembayaran</CardTitle>
              <CardDescription className="text-[11px] text-[#8b9f95]">{methods.length} metode terdaftar</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {methods.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Belum ada metode pembayaran. Tambahkan metode seperti Tunai, Transfer Bank, atau Gateway.
                </div>
              ) : (
                <div className="divide-y">
                  {methods.map((m) => (
                    <div key={m.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{m.name}</p>
                        <div className="mt-1 flex gap-2">
                          {m.is_cash && <Badge variant="outline" className="text-xs">Tunai</Badge>}
                          {m.is_gateway && <Badge variant="secondary" className="text-xs">Gateway</Badge>}
                          {!m.is_cash && !m.is_gateway && <Badge variant="outline" className="text-xs">Manual</Badge>}
                        </div>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingMethod(m)}>Ubah</Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingMethod(m)}>Hapus</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks" className="space-y-4">
          {canManage && (
            <Button size="sm" onClick={() => setBankOpen(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Tambah Rekening
            </Button>
          )}
          <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
            <CardHeader>
              <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Rekening Sekolah</CardTitle>
              <CardDescription className="text-[11px] text-[#8b9f95]">{banks.length} rekening terdaftar</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {banks.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Belum ada rekening. Tambahkan rekening tujuan transfer.
                </div>
              ) : (
                <div className="divide-y">
                  {banks.map((b) => (
                    <div key={b.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{b.bank_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.account_number} · a.n. {b.account_holder}
                        </p>
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingBank(b)}>Ubah</Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingBank(b)}>Hapus</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PaymentMethodDialog
        key={editingMethod?.id ?? "new-method"}
        open={methodOpen}
        onOpenChange={setMethodOpen}
        editing={editingMethod}
        onSaved={() => setMethodOpen(false)}
      />

      <BankAccountDialog
        key={editingBank?.id ?? "new-bank"}
        open={bankOpen}
        onOpenChange={setBankOpen}
        editing={editingBank}
        onSaved={() => setBankOpen(false)}
      />

      <RecordPaymentDialog
        key={payingInvoice?.id ?? "no-invoice"}
        open={payOpen}
        onOpenChange={setPayOpen}
        invoice={payingInvoice}
        studentName={payingInvoice ? students.find((s) => s.id === payingInvoice.student_id)?.nama_lengkap : undefined}
        remaining={
          payingInvoice
            ? Math.max(0, Number(payingInvoice.total_amount) - (paidByInvoice[payingInvoice.id] ?? 0))
            : 0
        }
        methods={methods}
        onSaved={() => {
          setPayOpen(false);
          setPayingInvoice(null);
        }}
      />

      {/* Delete Dialogs */}
      <AlertDialog open={Boolean(deletingMethod)} onOpenChange={() => setDeletingMethod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus metode ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingMethod ? `Metode pembayaran "${deletingMethod.name}" akan dihapus permanen.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteMethod(deletingMethod!)} disabled={!canManage} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deletingBank)} onOpenChange={() => setDeletingBank(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus rekening ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingBank ? `Rekening ${deletingBank.bank_name} akan dihapus permanen.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteBank(deletingBank!)} disabled={!canManage} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const DIALOG_CONTENT_CLASS =
  "flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[650px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0";
const DIALOG_HEADER_CLASS = "shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6";
const DIALOG_TITLE_CLASS = "text-[21px] font-semibold tracking-[-.05em] text-[#183d32]";
const DIALOG_FOOTER_CLASS =
  "mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end";

function useSavedEffect(state: FormState, onSaved: () => void) {
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onSaved]);
}

function PaymentMethodDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: PaymentMethod | null;
  onSaved: () => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(savePaymentMethod, undefined);
  useSavedEffect(state, onSaved);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_CLASS}>
        <form action={formAction} className="space-y-4">
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle className={DIALOG_TITLE_CLASS}>{editing ? "Ubah Metode" : "Tambah Metode"}</DialogTitle>
            <DialogDescription>Definisikan metode pembayaran yang tersedia.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <FieldLabel htmlFor="name" required>Nama Metode</FieldLabel>
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Tunai / Transfer BCA" required={!editing} />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox name="is_cash" defaultChecked={editing?.is_cash} />
              <span className="text-sm">Tunai (offline)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox name="is_gateway" defaultChecked={editing?.is_gateway} />
              <span className="text-sm">Payment Gateway</span>
            </label>
          </div>

          <DialogFooter className={DIALOG_FOOTER_CLASS}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BankAccountDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: BankAccount | null;
  onSaved: () => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveBankAccount, undefined);
  useSavedEffect(state, onSaved);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_CLASS}>
        <form action={formAction} className="space-y-4">
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle className={DIALOG_TITLE_CLASS}>{editing ? "Ubah Rekening" : "Tambah Rekening"}</DialogTitle>
            <DialogDescription>Rekening tujuan transfer.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <FieldLabel htmlFor="bank_name" required>Nama Bank</FieldLabel>
            <Input id="bank_name" name="bank_name" defaultValue={editing?.bank_name ?? ""} placeholder="BCA / Mandiri / BNI" required={!editing} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="account_number" required>Nomor Rekening</FieldLabel>
            <Input id="account_number" name="account_number" defaultValue={editing?.account_number ?? ""} placeholder="123-456-789" required={!editing} />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="account_holder" required>Nama Pemilik</FieldLabel>
            <Input id="account_holder" name="account_holder" defaultValue={editing?.account_holder ?? ""} placeholder="a.n. Sekolah" required={!editing} />
          </div>

          <DialogFooter className={DIALOG_FOOTER_CLASS}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  studentName,
  remaining,
  methods,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceRow | null;
  studentName?: string;
  remaining: number;
  methods: PaymentMethod[];
  onSaved: () => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(recordPaymentV2, undefined);
  useSavedEffect(state, onSaved);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={DIALOG_CONTENT_CLASS}>
        <form action={formAction} className="space-y-4">
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle className={DIALOG_TITLE_CLASS}>Catat Pembayaran</DialogTitle>
            <DialogDescription>
              {studentName} · {invoice?.period_label} · Sisa: {formatRupiah(remaining)}
            </DialogDescription>
          </DialogHeader>

          {invoice ? <input type="hidden" name="invoice_id" value={invoice.id} /> : null}

          <div className="space-y-2">
            <FieldLabel htmlFor="payment_method_id" required>Metode Pembayaran</FieldLabel>
            <Select name="payment_method_id" required>
              <SelectTrigger id="payment_method_id"><SelectValue placeholder="Pilih metode" /></SelectTrigger>
              <SelectContent>
                {methods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="nominal" required>Nominal Bayar</FieldLabel>
            <Input id="nominal" name="nominal" type="number" min={1} defaultValue={invoice ? remaining : ""} required />
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="catatan" optional>Catatan</FieldLabel>
            <Input id="catatan" name="catatan" placeholder="Catatan pembayaran" />
          </div>

          <DialogFooter className={DIALOG_FOOTER_CLASS}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Mencatat..." : "Catat Pembayaran"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
