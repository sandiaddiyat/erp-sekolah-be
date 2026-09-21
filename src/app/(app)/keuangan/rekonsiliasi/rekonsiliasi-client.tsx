"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [methodState, methodAction, methodSubmitting] = useActionState<FormState, FormData>(savePaymentMethod, undefined);

  // Bank account state
  const [bankOpen, setBankOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [deletingBank, setDeletingBank] = useState<BankAccount | null>(null);
  const [bankState, bankAction, bankSubmitting] = useActionState<FormState, FormData>(saveBankAccount, undefined);

  // Record payment state
  const [payOpen, setPayOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceRow | null>(null);
  const [payState, payAction, paySubmitting] = useActionState<FormState, FormData>(recordPaymentV2, undefined);

  useEffect(() => {
    if (methodState?.success) { toast.success(methodState.success); setMethodOpen(false); }
    else if (methodState?.error) toast.error(methodState.error);
  }, [methodState]);

  useEffect(() => {
    if (bankState?.success) { toast.success(bankState.success); setBankOpen(false); }
    else if (bankState?.error) toast.error(bankState.error);
  }, [bankState]);

  useEffect(() => {
    if (payState?.success) { toast.success(payState.success); setPayOpen(false); setPayingInvoice(null); }
    else if (payState?.error) toast.error(payState.error);
  }, [payState]);

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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Rekonsiliasi Pembayaran</h1>
        <p className="text-sm text-muted-foreground">
          Rekap status tagihan dan pembayaran per periode.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Belum Bayar</CardDescription>
            <CardTitle className="text-2xl">{summary.belum_bayar.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.belum_bayar.total)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sebagian</CardDescription>
            <CardTitle className="text-2xl">{summary.sebagian.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.sebagian.total)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lunas</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">{summary.lunas.count}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {formatRupiah(summary.lunas.total)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Batal</CardDescription>
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

          <Card>
            <CardHeader>
              <CardTitle>Tagihan ({filteredInvoices.length})</CardTitle>
              <CardDescription>Status ter-update otomatis setelah pembayaran dicatat</CardDescription>
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
                      <div key={inv.id} className="flex items-center justify-between gap-3 px-6 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{student?.nama_lengkap ?? inv.student_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {inv.period_label} · Jatuh tempo: {inv.due_date?.slice(0, 10)}
                          </p>
                          <div className="mt-1 text-xs">
                            <span className="text-muted-foreground">Total:</span>{" "}
                            <span className="font-medium">{formatRupiah(Number(inv.total_amount))}</span>{" "}
                            <span className="text-muted-foreground">· Terbayar:</span>{" "}
                            <span className="font-medium text-emerald-700">{formatRupiah(paid)}</span>
                            {remaining > 0 && (
                              <>
                                {" "}
                                <span className="text-muted-foreground">· Sisa:</span>{" "}
                                <span className="font-medium text-red-700">{formatRupiah(remaining)}</span>
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
          <Card>
            <CardHeader>
              <CardTitle>Metode Pembayaran</CardTitle>
              <CardDescription>{methods.length} metode terdaftar</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {methods.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Belum ada metode pembayaran. Tambahkan metode seperti Tunai, Transfer Bank, atau Gateway.
                </div>
              ) : (
                <div className="divide-y">
                  {methods.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 px-6 py-3">
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
          <Card>
            <CardHeader>
              <CardTitle>Rekening Sekolah</CardTitle>
              <CardDescription>{banks.length} rekening terdaftar</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {banks.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Belum ada rekening. Tambahkan rekening tujuan transfer.
                </div>
              ) : (
                <div className="divide-y">
                  {banks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 px-6 py-3">
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

      {/* Payment Method Form */}
      <Dialog open={methodOpen} onOpenChange={setMethodOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={methodAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingMethod ? "Ubah Metode" : "Tambah Metode"}</DialogTitle>
              <DialogDescription>Definisikan metode pembayaran yang tersedia.</DialogDescription>
            </DialogHeader>

            {editingMethod ? <input type="hidden" name="id" value={editingMethod.id} /> : null}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Metode</Label>
              <Input id="name" name="name" defaultValue={editingMethod?.name ?? ""} placeholder="Tunai / Transfer BCA" required />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox name="is_cash" defaultChecked={editingMethod?.is_cash} />
                <span className="text-sm">Tunai (offline)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox name="is_gateway" defaultChecked={editingMethod?.is_gateway} />
                <span className="text-sm">Payment Gateway</span>
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMethodOpen(false)}>Batal</Button>
              <Button type="submit" disabled={methodSubmitting}>{methodSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bank Account Form */}
      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={bankAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingBank ? "Ubah Rekening" : "Tambah Rekening"}</DialogTitle>
              <DialogDescription>Rekening tujuan transfer.</DialogDescription>
            </DialogHeader>

            {editingBank ? <input type="hidden" name="id" value={editingBank.id} /> : null}

            <div className="space-y-2">
              <Label htmlFor="bank_name">Nama Bank</Label>
              <Input id="bank_name" name="bank_name" defaultValue={editingBank?.bank_name ?? ""} placeholder="BCA / Mandiri / BNI" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Nomor Rekening</Label>
              <Input id="account_number" name="account_number" defaultValue={editingBank?.account_number ?? ""} placeholder="123-456-789" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_holder">Nama Pemilik</Label>
              <Input id="account_holder" name="account_holder" defaultValue={editingBank?.account_holder ?? ""} placeholder="a.n. Sekolah" required />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBankOpen(false)}>Batal</Button>
              <Button type="submit" disabled={bankSubmitting}>{bankSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={payAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Catat Pembayaran</DialogTitle>
              <DialogDescription>
                {payingInvoice && (
                  <>
                    {students.find((s) => s.id === payingInvoice.student_id)?.nama_lengkap} · {payingInvoice.period_label} · Sisa:{" "}
                    {formatRupiah(Math.max(0, Number(payingInvoice.total_amount) - (paidByInvoice[payingInvoice.id] ?? 0)))}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {payingInvoice && <input type="hidden" name="invoice_id" value={payingInvoice.id} />}

            <div className="space-y-2">
              <Label htmlFor="payment_method_id">Metode Pembayaran</Label>
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
              <Label htmlFor="nominal">Nominal Bayar</Label>
              <Input
                id="nominal"
                name="nominal"
                type="number"
                min={1}
                defaultValue={payingInvoice
                  ? Math.max(0, Number(payingInvoice.total_amount) - (paidByInvoice[payingInvoice.id] ?? 0))
                  : ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan">Catatan (opsional)</Label>
              <Input id="catatan" name="catatan" placeholder="Catatan pembayaran" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayOpen(false)}>Batal</Button>
              <Button type="submit" disabled={paySubmitting}>{paySubmitting ? "Mencatat..." : "Catat Pembayaran"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
