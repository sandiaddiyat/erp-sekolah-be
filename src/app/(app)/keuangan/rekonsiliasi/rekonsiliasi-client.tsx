"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, Banknote, PencilIcon, Trash2Icon } from "lucide-react";
import { FinanceDataTable } from "@/components/finance/finance-data-table";
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
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRow | null>(null);

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
  const [dialogKeyMethod, setDialogKeyMethod] = useState(0);
  const [dialogKeyBank, setDialogKeyBank] = useState(0);
  const [dialogKeyPay, setDialogKeyPay] = useState(0);

  const statusFilteredInvoices = useMemo(
    () => invoices.filter((invoice) => statusFilter === "all" || invoice.status === statusFilter),
    [invoices, statusFilter]
  );

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
          <div className="flex justify-end">
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value as InvoiceStatus | "all"); setQuery(""); }}>
              <SelectTrigger className="w-48 border-[#e2ece5] text-xs"><SelectValue placeholder="Filter status" /></SelectTrigger>
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
              <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Daftar Tagihan</CardTitle>
              <CardDescription className="text-[11px] text-[#8b9f95]">Status ter-update otomatis setelah pembayaran dicatat</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <FinanceDataTable
                rows={statusFilteredInvoices}
                rowKey={(invoice) => invoice.id}
                search={query}
                onSearchChange={setQuery}
                emptyLabel="Belum ada tagihan."
                filteredEmptyLabel="Tidak ada tagihan yang cocok dengan pencarian."
                columns={[
                  { key: "student", label: "Siswa", searchable: true, searchValue: (invoice) => students.find((student) => student.id === invoice.student_id)?.nama_lengkap ?? invoice.student_id, sortValue: (invoice) => students.find((student) => student.id === invoice.student_id)?.nama_lengkap ?? invoice.student_id, sticky: true, render: (invoice) => <span className="block truncate text-xs font-semibold text-[#2b493e]">{students.find((student) => student.id === invoice.student_id)?.nama_lengkap ?? invoice.student_id}</span> },
                  { key: "period", label: "Periode", searchable: true, searchValue: (invoice) => invoice.period_label, sortValue: (invoice) => invoice.period_label, render: (invoice) => <span className="text-xs text-[#3e5c50]">{invoice.period_label}</span> },
                  { key: "due_date", label: "Jatuh Tempo", sortValue: (invoice) => invoice.due_date, render: (invoice) => <span className="text-xs text-[#3e5c50]">{invoice.due_date?.slice(0, 10) ?? "-"}</span> },
                  { key: "total", label: "Total", sortValue: (invoice) => Number(invoice.total_amount), render: (invoice) => <span className="text-xs font-semibold text-[#2b493e]">{formatRupiah(Number(invoice.total_amount))}</span> },
                  { key: "paid", label: "Terbayar", sortValue: (invoice) => paidByInvoice[invoice.id] ?? 0, render: (invoice) => <span className="text-xs text-[#2b7254]">{formatRupiah(paidByInvoice[invoice.id] ?? 0)}</span> },
                  { key: "status", label: "Status", sortValue: (invoice) => invoice.status, render: (invoice) => <Badge variant={STATUS_VARIANT[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge> },
                ]}
                onRowClick={setViewingInvoice}
                actions={canManage ? (invoice) => {
                  const remaining = Math.max(0, Number(invoice.total_amount) - (paidByInvoice[invoice.id] ?? 0));
                  return remaining > 0 ? <Button size="icon-sm" aria-label="Catat pembayaran" className="border border-[#e1ebe4] bg-white text-[#537467] hover:bg-[#f4faf5]" onClick={() => openPaymentDialog(invoice)}><Banknote className="size-4" /></Button> : null;
                } : undefined}
              />
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
                <FinanceDataTable
                  rows={methods}
                  rowKey={(method) => method.id}
                  search={query}
                  onSearchChange={setQuery}
                  emptyLabel="Belum ada metode pembayaran."
                  columns={[
                    { key: "name", label: "Nama Metode", searchable: true, searchValue: (method) => method.name, sortValue: (method) => method.name, sticky: true, render: (method) => <span className="text-xs font-semibold text-[#2b493e]">{method.name}</span> },
                    { key: "cash", label: "Tunai", sortValue: (method) => Number(method.is_cash), render: (method) => <span className="text-xs text-[#3e5c50]">{method.is_cash ? "Ya" : "Tidak"}</span> },
                    { key: "gateway", label: "Gateway", sortValue: (method) => Number(method.is_gateway), render: (method) => <span className="text-xs text-[#3e5c50]">{method.is_gateway ? "Ya" : "Tidak"}</span> },
                  ]}
                  actions={canManage ? (method) => <div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="Ubah metode pembayaran" className="border border-[#e1ebe4] bg-white text-[#537467] hover:bg-[#f4faf5]" onClick={() => setEditingMethod(method)}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus metode pembayaran" className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:bg-[#fff7f5]" onClick={() => setDeletingMethod(method)}><Trash2Icon className="size-4" /></Button></div> : undefined}
                />
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
                <FinanceDataTable
                  rows={banks}
                  rowKey={(bank) => bank.id}
                  search={query}
                  onSearchChange={setQuery}
                  emptyLabel="Belum ada rekening sekolah."
                  columns={[
                    { key: "bank", label: "Bank", searchable: true, searchValue: (bank) => bank.bank_name, sortValue: (bank) => bank.bank_name, sticky: true, render: (bank) => <span className="text-xs font-semibold text-[#2b493e]">{bank.bank_name}</span> },
                    { key: "account", label: "Nomor Rekening", searchable: true, searchValue: (bank) => bank.account_number, sortValue: (bank) => bank.account_number, render: (bank) => <span className="text-xs text-[#3e5c50]">{bank.account_number}</span> },
                    { key: "holder", label: "Pemilik", searchable: true, searchValue: (bank) => bank.account_holder, sortValue: (bank) => bank.account_holder, render: (bank) => <span className="text-xs text-[#3e5c50]">{bank.account_holder}</span> },
                  ]}
                  actions={canManage ? (bank) => <div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="Ubah rekening" className="border border-[#e1ebe4] bg-white text-[#537467] hover:bg-[#f4faf5]" onClick={() => setEditingBank(bank)}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus rekening" className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:bg-[#fff7f5]" onClick={() => setDeletingBank(bank)}><Trash2Icon className="size-4" /></Button></div> : undefined}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(viewingInvoice)} onOpenChange={(open) => !open && setViewingInvoice(null)}>
        <DialogContent className="border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] p-0">
          <DialogHeader className="border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6"><DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Tagihan</DialogTitle><DialogDescription>{viewingInvoice?.period_label ?? "-"}</DialogDescription></DialogHeader>
          {viewingInvoice ? <dl className="grid grid-cols-2 gap-4 px-7 py-6"><DetailItem label="Siswa" value={students.find((student) => student.id === viewingInvoice.student_id)?.nama_lengkap ?? viewingInvoice.student_id} /><DetailItem label="Jatuh Tempo" value={viewingInvoice.due_date?.slice(0, 10) ?? "-"} /><DetailItem label="Total" value={formatRupiah(Number(viewingInvoice.total_amount))} /><DetailItem label="Terbayar" value={formatRupiah(paidByInvoice[viewingInvoice.id] ?? 0)} /><DetailItem label="Sisa" value={formatRupiah(Math.max(0, Number(viewingInvoice.total_amount) - (paidByInvoice[viewingInvoice.id] ?? 0)))} /><DetailItem label="Status" value={STATUS_LABELS[viewingInvoice.status]} /></dl> : null}
          <DialogFooter className="border-t border-[#e3ece6] bg-white px-7 py-[15px]"><Button variant="outline" onClick={() => setViewingInvoice(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentMethodDialog
        key={`method-${editingMethod?.id ?? dialogKeyMethod}`}
        open={methodOpen}
        onOpenChange={(open) => {
          if (open) {
            setEditingMethod(null);
            setDialogKeyMethod(k => k + 1);
          }
          setMethodOpen(open);
        }}
        editing={editingMethod}
        onSaved={() => setMethodOpen(false)}
      />

      <BankAccountDialog
        key={`bank-${editingBank?.id ?? dialogKeyBank}`}
        open={bankOpen}
        onOpenChange={(open) => {
          if (open) {
            setEditingBank(null);
            setDialogKeyBank(k => k + 1);
          }
          setBankOpen(open);
        }}
        editing={editingBank}
        onSaved={() => setBankOpen(false)}
      />

      <RecordPaymentDialog
        key={`payment-${payingInvoice?.id ?? dialogKeyPay}`}
        open={payOpen}
        onOpenChange={(open) => {
          if (open) {
            setPayingInvoice(null);
            setDialogKeyPay(k => k + 1);
          }
          setPayOpen(open);
        }}
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold tracking-[.04em] text-[#8b9f95] uppercase">{label}</dt><dd className="mt-1 truncate text-xs text-[#2b493e]" title={value}>{value}</dd></div>;
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
