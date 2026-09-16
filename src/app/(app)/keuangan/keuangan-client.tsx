"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon, WalletIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { BillItem, Payment } from "@/lib/types";
import type { BillWithStudent } from "@/lib/types";
import type { FormState } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { createBill, deleteBill, deleteBillItem, recordPayment, saveBillItem, verifyPayment } from "./actions";
import type { StudentOption } from "./page";

type Permissions = {
  billCreate: boolean;
  paymentCreate: boolean;
  verify: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  belum_bayar: "Belum Bayar",
  menunggu_verifikasi: "Menunggu Verifikasi",
  cicilan: "Cicilan",
  lunas: "Lunas",
  batal: "Batal",
};

function statusBadgeClass(status: string): string {
  if (status === "lunas") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  if (status === "cicilan") return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
  if (status === "menunggu_verifikasi") return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  if (status === "batal") return "bg-muted text-muted-foreground";
  return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
}

export function KeuanganClient({
  bills,
  billItems,
  students,
  payments,
  permissions,
}: {
  bills: (BillWithStudent & { student_nama: string | null })[];
  billItems: BillItem[];
  students: StudentOption[];
  payments: Payment[];
  permissions: Permissions;
}) {
  const [query, setQuery] = useState("");
  const [billOpen, setBillOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<BillWithStudent | null>(null);
  const [verifying, setVerifying] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState<BillWithStudent | null>(null);
  const [itemOpen, setItemOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BillItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const paymentByBill = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      const list = map.get(p.bill_id) ?? [];
      list.push(p);
      map.set(p.bill_id, list);
    }
    return map;
  }, [payments]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return bills;
    return bills.filter((item) =>
      [item.deskripsi, item.student_nama ?? "", STATUS_LABEL[item.status] ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, bills]);

  const handleVerify = (keputusan: "terverifikasi" | "ditolak") => {
    if (!verifying) return;
    const target = verifying;
    startTransition(async () => {
      const result = await verifyPayment(target.id, keputusan);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setVerifying(null);
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteBill(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  const handleDeleteItem = () => {
    if (!deletingItem) return;
    const target = deletingItem;
    startTransition(async () => {
      const result = await deleteBillItem(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeletingItem(null);
    });
  };

  const totalTagihanSetelahDiskon = (b: BillWithStudent) =>
    Number(b.nominal) - Number(b.diskon ?? 0);

  /** Sisa tagihan = total setelah diskon - pembayaran terverifikasi. */
  const sisaTagihan = (b: BillWithStudent) => {
    const terbayar = (paymentByBill.get(b.id) ?? [])
      .filter((p) => p.status === "terverifikasi")
      .reduce((sum, p) => sum + Number(p.nominal), 0);
    return totalTagihanSetelahDiskon(b) - terbayar;
  };

  const totalTunggakan = useMemo(
    () =>
      bills
        .filter((b) => b.status !== "lunas" && b.status !== "batal")
        .reduce((sum, b) => sum + sisaTagihan(b), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bills, paymentByBill]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">SPP & Keuangan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola tagihan, pembayaran, dan verifikasi.
          </p>
        </div>
        {permissions.billCreate ? (
          <Button onClick={() => setBillOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Buat Tagihan
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-40">
          <CardHeader className="pb-1">
            <CardDescription>Total tagihan</CardDescription>
            <CardTitle className="text-xl">{bills.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="flex-1 min-w-40">
          <CardHeader className="pb-1">
            <CardDescription>Belum lunas</CardDescription>
            <CardTitle className="text-xl">
              {bills.filter((b) => b.status !== "lunas" && b.status !== "batal").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="flex-1 min-w-56">
          <CardHeader className="pb-1">
            <CardDescription>Total tunggakan</CardDescription>
            <CardTitle className="text-xl">{formatRupiah(totalTunggakan)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {permissions.billCreate ? (
        <Card>
          <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <CardTitle>Jenis Tagihan</CardTitle>
              <CardDescription>
                Katalog tagihan: {billItems.length} jenis
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setItemOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Tambah Jenis
            </Button>
          </CardHeader>
          {billItems.length > 0 ? (
            <CardContent className="px-0">
              <div className="divide-y">
                {billItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 px-6 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.nama_item}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatRupiah(Number(item.nominal))} • {item.frekuensi}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingItem(item)}
                    >
                      Hapus
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>Daftar Tagihan</CardTitle>
            <CardDescription>
              {filtered.length} dari {bills.length} tagihan
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari siswa, deskripsi, status..."
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada tagihan</p>
              <p className="text-sm text-muted-foreground">
                {permissions.billCreate
                  ? "Buat tagihan pertama untuk mulai."
                  : "Hubungi admin sekolah untuk membuat tagihan."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => {
                const billPayments = paymentByBill.get(item.id) ?? [];
                const menunggu = billPayments.find((p) => p.status === "menunggu");
                const lunas = billPayments.find((p) => p.status === "terverifikasi");
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.student_nama ?? "Siswa tidak dikenal"}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {item.deskripsi}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatRupiah(totalTagihanSetelahDiskon(item))}
                        {Number(item.diskon ?? 0) > 0
                          ? ` • diskon ${formatRupiah(Number(item.diskon))}${
                              item.diskon_keterangan ? ` (${item.diskon_keterangan})` : ""
                            }`
                          : ""}
                        {item.status !== "lunas" && item.status !== "batal"
                          ? ` • sisa ${formatRupiah(sisaTagihan(item))}`
                          : ""}
                        {item.jatuh_tempo ? ` • jatuh tempo ${item.jatuh_tempo}` : ""}
                        {lunas
                          ? ` • dibayar via ${lunas.metode}`
                          : menunggu
                            ? " • menunggu verifikasi pembayaran"
                            : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {STATUS_LABEL[item.status] ?? item.status}
                      </span>
                      {permissions.paymentCreate &&
                      (item.status === "belum_bayar" ||
                        item.status === "menunggu_verifikasi" ||
                        item.status === "cicilan") ? (
                        <Button variant="outline" size="sm" onClick={() => setPayTarget(item)}>
                          <WalletIcon data-icon="inline-start" />
                          Bayar
                        </Button>
                      ) : null}
                      {permissions.verify && menunggu ? (
                        <Button variant="outline" size="sm" onClick={() => setVerifying(menunggu)}>
                          Verifikasi
                        </Button>
                      ) : null}
                      {permissions.billCreate && item.status !== "lunas" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(item)}
                        >
                          Hapus
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={Boolean(deletingItem)}
        onOpenChange={(open) => !open && setDeletingItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jenis tagihan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingItem?.nama_item} akan dihapus dari katalog. Tagihan yang
              sudah dibuat tidak ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BillItemFormDialog
        key="new-bill-item"
        open={itemOpen}
        onOpenChange={setItemOpen}
      />

      <BillFormDialog
        key="new-bill"
        open={billOpen}
        onOpenChange={setBillOpen}
        students={students}
        billItems={billItems}
      />

      <PaymentFormDialog
        key={payTarget?.id ?? "pay"}
        open={Boolean(payTarget)}
        onOpenChange={(open) => !open && setPayTarget(null)}
        bill={payTarget}
        billPayments={payTarget ? paymentByBill.get(payTarget.id) ?? [] : []}
      />

      <AlertDialog
        open={Boolean(verifying)}
        onOpenChange={(open) => !open && setVerifying(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proses pembayaran ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Pembayaran {verifying ? formatRupiah(Number(verifying.nominal)) : ""} via{" "}
              {verifying?.metode ?? "-"} untuk tagihan{" "}
              {verifying
                ? bills.find((b) => b.id === verifying.bill_id)?.deskripsi ?? "-"
                : "-"}
              . Setujui untuk menandai tagihan lunas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleVerify("ditolak")}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Tolak
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleVerify("terverifikasi")} disabled={isPending}>
              Setujui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus tagihan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.deskripsi} untuk {deleting?.student_nama ?? "-"} akan dihapus
              permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BillItemFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveBillItem,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Tambah Jenis Tagihan</DialogTitle>
            <DialogDescription>
              Katalog jenis tagihan yang bisa dipilih saat membuat tagihan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="nama_item">Nama Jenis</Label>
            <Input
              id="nama_item"
              name="nama_item"
              placeholder="Contoh: SPP Bulanan"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item_nominal">Nominal (Rp)</Label>
              <Input id="item_nominal" name="nominal" placeholder="150000" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="frekuensi">Frekuensi</Label>
              <select
                id="frekuensi"
                name="frekuensi"
                required
                defaultValue="bulanan"
                className={selectClass}
              >
                <option value="sekali">Sekali</option>
                <option value="bulanan">Bulanan</option>
                <option value="tahunan">Tahunan</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Tambah Jenis"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BillFormDialog({
  open,
  onOpenChange,
  students,
  billItems,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentOption[];
  billItems: BillItem[];
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    createBill,
    undefined
  );

  const [selectedItemId, setSelectedItemId] = useState("");
  const [nominal, setNominal] = useState("");

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Buat Tagihan</DialogTitle>
            <DialogDescription>
              Tagihan akan muncul di daftar siswa terkait.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="student_id">Siswa</Label>
            <select id="student_id" name="student_id" required className={selectClass}>
              <option value="">- pilih siswa -</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nama_lengkap}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill_item_id">Jenis Tagihan (opsional)</Label>
            <select
              id="bill_item_id"
              name="bill_item_id"
              className={selectClass}
              value={selectedItemId}
              onChange={(event) => {
                const item = billItems.find((b) => b.id === event.target.value);
                setSelectedItemId(event.target.value);
                if (item) {
                  setNominal(String(Number(item.nominal)));
                }
              }}
            >
              <option value="">- tidak ada -</option>
              {billItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nama_item} ({formatRupiah(Number(item.nominal))})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deskripsi">Deskripsi</Label>
            <Input
              id="deskripsi"
              name="deskripsi"
              placeholder="Contoh: SPP Juli 2026"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nominal">Nominal (Rp)</Label>
              <Input
                id="nominal"
                name="nominal"
                placeholder="150000"
                value={nominal}
                onChange={(event) => setNominal(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diskon">Diskon (Rp, opsional)</Label>
              <Input id="diskon" name="diskon" placeholder="0" inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diskon_keterangan">
              Keterangan Diskon / Beasiswa (opsional)
            </Label>
            <Input
              id="diskon_keterangan"
              name="diskon_keterangan"
              placeholder="Contoh: Beasiswa Yayasan 50%"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jatuh_tempo">Jatuh Tempo</Label>
            <Input id="jatuh_tempo" name="jatuh_tempo" type="date" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Buat Tagihan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentFormDialog({
  open,
  onOpenChange,
  bill,
  billPayments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: BillWithStudent | null;
  billPayments: Payment[];
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    recordPayment,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  const totalSetelahDiskon = bill
    ? Number(bill.nominal) - Number(bill.diskon ?? 0)
    : 0;
  const terbayar = bill
    ? (billPayments
        .filter((p) => p.status === "terverifikasi")
        .reduce((sum, p) => sum + Number(p.nominal), 0))
    : 0;
  const sisa = totalSetelahDiskon - terbayar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran</DialogTitle>
            <DialogDescription>
              {bill?.student_nama ?? "-"} • {bill?.deskripsi ?? "-"} •{" "}
              {bill ? formatRupiah(totalSetelahDiskon) : "-"}
              {bill && Number(bill.diskon ?? 0) > 0
                ? ` (diskon ${formatRupiah(Number(bill.diskon))})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {bill ? <input type="hidden" name="bill_id" value={bill.id} /> : null}

          {bill ? (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              Total setelah diskon: {formatRupiah(totalSetelahDiskon)} • Terbayar:{" "}
              {formatRupiah(terbayar)} • Sisa: {formatRupiah(sisa)}. Bisa dibayar
              sekaligus maupun dicicil — sisa akan terus berkurang setiap cicilan
              diverifikasi.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pay_nominal">Nominal Bayar (Rp)</Label>
              <Input
                id="pay_nominal"
                name="nominal"
                defaultValue={bill ? String(Math.max(sisa, 0)) : ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metode">Metode</Label>
              <select id="metode" name="metode" required defaultValue="transfer" className={selectClass}>
                <option value="transfer">Transfer</option>
                <option value="tunai">Tunai</option>
                <option value="qris">QRIS</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bukti_url">URL Bukti (opsional)</Label>
            <Input
              id="bukti_url"
              name="bukti_url"
              placeholder="https://... (tautan gambar bukti transfer)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="catatan">Catatan (opsional)</Label>
            <Input id="catatan" name="catatan" placeholder="Catatan pembayaran" />
          </div>

          <Separator />

          <p className="text-xs text-muted-foreground">
            Pembayaran berstatus menunggu sampai diverifikasi petugas.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Catat Pembayaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
