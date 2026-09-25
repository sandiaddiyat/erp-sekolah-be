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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillItem, Payment } from "@/lib/types";
import type { BillWithStudent, PaymentMetode } from "@/lib/types";
import type { FormState } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { createBill, deleteBill, recordPayment, verifyPayment } from "./actions";
import type { StudentOption } from "./page";

type BillPayment = Payment & {
  bill_id: string;
  metode: PaymentMetode;
};

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

// Palet referensi: Template-ERP-Sekolah (blok "finance management").
const STATUS_PILL: Record<string, string> = {
  belum_bayar: "bg-[#fdeceb] text-[#a4564d]",
  menunggu_verifikasi: "bg-[#fcf3df] text-[#967233]",
  cicilan: "bg-[#fcf3df] text-[#967233]",
  lunas: "bg-[#e7f5e9] text-[#2b7254]",
  batal: "bg-[#eef1ef] text-[#6b7a72]",
};

const PRIMARY_BUTTON =
  "h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]";
const SECONDARY_BUTTON =
  "h-[29px] rounded-[9px] border border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]";
const DELETE_BUTTON =
  "h-[29px] rounded-[7px] border border-[#ecd9d5] bg-white px-[9px] text-[10px] font-bold text-[#b06c63] hover:border-[#dcaea7] hover:bg-[#fff5f3] hover:text-[#b06c63]";

const FINANCE_PANEL =
  "mb-[23px] rounded-[15px] border border-[#e2ece5] bg-white shadow-[0_3px_7px_#1c443302]";
const FINANCE_HEADING =
  "flex items-start justify-between gap-[15px] border-b border-[#edf2ee] px-[21px] pb-4 pt-5";
const FINANCE_LIST = "px-[21px] pb-[7px]";
const FINANCE_ROW =
  "flex items-center gap-[15px] border-b border-[#f0f5f1] px-[3px] py-[13px] last:border-b-0";

const MODAL_CONTENT =
  "max-h-[92vh] gap-0 overflow-hidden rounded-[17px] border-[#dbe8df] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_#0d322238] sm:max-w-[650px]";
const MODAL_HEADER =
  "flex items-start justify-between gap-5 border-b border-[#e5eee8] bg-white px-6 pb-[18px] pt-[22px]";
const MODAL_BODY = "max-h-[60vh] space-y-4 overflow-y-auto px-6 py-[22px]";
const MODAL_FOOTER =
  "flex items-center justify-end gap-2 border-t border-[#e3ece6] bg-white px-6 py-[14px]";

const INPUT_CLASS =
  "h-10 rounded-[9px] border-[#dfeae3] text-[11px] text-[#36584a] focus-visible:border-[#78ad8a] focus-visible:ring-[#4f9970]/10";
const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus-visible:border-[#78ad8a] focus-visible:ring-[#4f9970]/10 dark:bg-input/30";
const LABEL_CLASS = "text-[10px] font-bold text-[#4c6a5e]";

function statusPillClass(status: string): string {
  return STATUS_PILL[status] ?? "bg-[#eef1ef] text-[#6b7a72]";
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
  const [verifying, setVerifying] = useState<BillPayment | null>(null);
  const [deleting, setDeleting] = useState<BillWithStudent | null>(null);
  const [isPending, startTransition] = useTransition();

  const paymentByBill = useMemo(() => {
    const map = new Map<string, BillPayment[]>();
    for (const payment of payments) {
      if (!payment.bill_id || !payment.metode) continue;
      const billPayment = payment as BillPayment;
      const list = map.get(billPayment.bill_id) ?? [];
      list.push(billPayment);
      map.set(billPayment.bill_id, list);
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
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">
            Keuangan
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">
            SPP &amp; Keuangan
          </h1>
          <p className="mt-2 text-xs text-[#82978d]">
            Kelola tagihan, pembayaran, dan verifikasi.
          </p>
        </div>
        {permissions.billCreate ? (
          <Button className={PRIMARY_BUTTON} onClick={() => setBillOpen(true)}>
            <PlusIcon data-icon="inline-start" className="size-4" />
            Buat Tagihan
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-[17px]">
        <article className="min-h-[92px] rounded-[14px] border border-[#e2ece5] bg-white px-[19px] py-[17px]">
          <span className="block text-[11px] font-semibold text-[#789087]">
            Total tagihan
          </span>
          <strong className="mt-[13px] block font-heading text-[22px] font-medium text-[#183c31]">
            {bills.length}
          </strong>
        </article>
        <article className="min-h-[92px] rounded-[14px] border border-[#e2ece5] bg-white px-[19px] py-[17px]">
          <span className="block text-[11px] font-semibold text-[#789087]">
            Belum lunas
          </span>
          <strong className="mt-[13px] block font-heading text-[22px] font-medium text-[#183c31]">
            {bills.filter((b) => b.status !== "lunas" && b.status !== "batal").length}
          </strong>
        </article>
        <article className="min-h-[92px] rounded-[14px] border border-[#e2ece5] bg-white px-[19px] py-[17px]">
          <span className="block text-[11px] font-semibold text-[#789087]">
            Total tunggakan
          </span>
          <strong className="mt-[13px] block font-heading text-[22px] font-medium text-[#183c31]">
            {formatRupiah(totalTunggakan)}
          </strong>
        </article>
      </div>

      <section className={`${FINANCE_PANEL} mb-0`}>
        <div className={`${FINANCE_HEADING} flex-col sm:flex-row`}>
          <div>
            <h2 className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">
              Daftar Tagihan
            </h2>
            <p className="mt-1.5 text-[11px] text-[#8b9f95]">
              {filtered.length} dari {bills.length} tagihan
            </p>
          </div>
          <div className="relative w-full sm:w-[270px]">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#91a49a]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari siswa, deskripsi, status..."
              className="h-[35px] rounded-[9px] border-[#e2ece5] bg-[#fcfdfc] pl-9 text-[11px] text-[#284a3d] placeholder:text-[#91a49a] focus-visible:border-[#9dc7a8] focus-visible:ring-[#4d986f]/10"
            />
          </div>
        </div>
        <div className={FINANCE_LIST}>
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-semibold text-[#3e5c50]">Belum ada tagihan</p>
              <p className="mt-1 text-xs text-[#a0afa8]">
                {permissions.billCreate
                  ? "Buat tagihan pertama untuk mulai."
                  : "Hubungi admin sekolah untuk membuat tagihan."}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const billPayments = paymentByBill.get(item.id) ?? [];
              const menunggu = billPayments.find((p) => p.status === "menunggu");
              const lunas = billPayments.find((p) => p.status === "terverifikasi");
              return (
                <div
                  key={item.id}
                  className={`${FINANCE_ROW} min-h-[72px] flex-wrap sm:flex-nowrap`}
                >
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <strong className="block text-[12px] text-[#2b493e]">
                      {item.student_nama ?? "Siswa tidak dikenal"}
                    </strong>
                    <span className="mt-1 block text-[10px] text-[#7d9389]">
                      {item.deskripsi}
                    </span>
                    <small className="mt-1 block text-[9px] text-[#9aaa9f]">
                      {formatRupiah(totalTagihanSetelahDiskon(item))}
                      {Number(item.diskon ?? 0) > 0
                        ? ` · diskon ${formatRupiah(Number(item.diskon))}${
                            item.diskon_keterangan ? ` (${item.diskon_keterangan})` : ""
                          }`
                        : ""}
                      {item.status !== "lunas" && item.status !== "batal"
                        ? ` · sisa ${formatRupiah(sisaTagihan(item))}`
                        : ""}
                      {item.jatuh_tempo ? ` · jatuh tempo ${item.jatuh_tempo}` : ""}
                      {lunas
                        ? ` · dibayar via ${lunas.metode}`
                        : menunggu
                          ? " · menunggu verifikasi pembayaran"
                          : ""}
                    </small>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-[6px] px-2 py-[5px] text-[9px] font-bold whitespace-nowrap ${statusPillClass(item.status)}`}
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                    {permissions.paymentCreate &&
                    (item.status === "belum_bayar" ||
                      item.status === "menunggu_verifikasi" ||
                      item.status === "cicilan") ? (
                      <Button
                        variant="outline"
                        className={SECONDARY_BUTTON}
                        onClick={() => setPayTarget(item)}
                      >
                        <WalletIcon data-icon="inline-start" className="size-3.5" />
                        Bayar
                      </Button>
                    ) : null}
                    {permissions.verify && menunggu ? (
                      <Button
                        variant="outline"
                        className={SECONDARY_BUTTON}
                        onClick={() => setVerifying(menunggu)}
                      >
                        Verifikasi
                      </Button>
                    ) : null}
                    {permissions.billCreate && item.status !== "lunas" ? (
                      <Button
                        variant="outline"
                        className={DELETE_BUTTON}
                        onClick={() => setDeleting(item)}
                      >
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={MODAL_CONTENT}>
        <form action={formAction}>
          <div className={MODAL_HEADER}>
            <DialogTitle className="font-heading text-[20px] tracking-[-0.05em] text-[#183d32]">
              Buat Tagihan
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[11px] leading-relaxed text-[#83988e]">
              Tagihan akan muncul di daftar siswa terkait.
            </DialogDescription>
          </div>

          <div className={MODAL_BODY}>
            <div className="space-y-2">
              <Label htmlFor="student_id" className={LABEL_CLASS}>
                Siswa
              </Label>
              <select id="student_id" name="student_id" required className={SELECT_CLASS}>
                <option value="">- pilih siswa -</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama_lengkap}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bill_item_id" className={LABEL_CLASS}>
                Jenis Tagihan (opsional)
              </Label>
              <select
                id="bill_item_id"
                name="bill_item_id"
                className={SELECT_CLASS}
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
              <Label htmlFor="deskripsi" className={LABEL_CLASS}>
                Deskripsi
              </Label>
              <Input
                id="deskripsi"
                name="deskripsi"
                placeholder="Contoh: SPP Juli 2026"
                className={INPUT_CLASS}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nominal" className={LABEL_CLASS}>
                  Nominal (Rp)
                </Label>
                <Input
                  id="nominal"
                  name="nominal"
                  placeholder="150000"
                  value={nominal}
                  onChange={(event) => setNominal(event.target.value)}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diskon" className={LABEL_CLASS}>
                  Diskon (Rp, opsional)
                </Label>
                <Input
                  id="diskon"
                  name="diskon"
                  placeholder="0"
                  inputMode="numeric"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diskon_keterangan" className={LABEL_CLASS}>
                Keterangan Diskon / Beasiswa (opsional)
              </Label>
              <Input
                id="diskon_keterangan"
                name="diskon_keterangan"
                placeholder="Contoh: Beasiswa Yayasan 50%"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jatuh_tempo" className={LABEL_CLASS}>
                Jatuh Tempo
              </Label>
              <Input
                id="jatuh_tempo"
                name="jatuh_tempo"
                type="date"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className={MODAL_FOOTER}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
              {isSubmitting ? "Menyimpan..." : "Buat Tagihan"}
            </Button>
          </div>
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
  billPayments: BillPayment[];
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
      <DialogContent className={MODAL_CONTENT}>
        <form action={formAction}>
          <div className={MODAL_HEADER}>
            <DialogTitle className="font-heading text-[20px] tracking-[-0.05em] text-[#183d32]">
              Catat Pembayaran
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-[11px] leading-relaxed text-[#83988e]">
              {bill?.student_nama ?? "-"} · {bill?.deskripsi ?? "-"} ·{" "}
              {bill ? formatRupiah(totalSetelahDiskon) : "-"}
              {bill && Number(bill.diskon ?? 0) > 0
                ? ` (diskon ${formatRupiah(Number(bill.diskon))})`
                : ""}
            </DialogDescription>
          </div>

          <div className={MODAL_BODY}>
            {bill ? <input type="hidden" name="bill_id" value={bill.id} /> : null}

            {bill ? (
              <p className="rounded-[9px] bg-[#f0f6f1] px-[13px] py-[11px] text-[10px] leading-relaxed text-[#628074]">
                Total setelah diskon: {formatRupiah(totalSetelahDiskon)} · Terbayar:{" "}
                {formatRupiah(terbayar)} · Sisa: {formatRupiah(sisa)}. Bisa dibayar
                sekaligus maupun dicicil — sisa akan terus berkurang setiap cicilan
                diverifikasi.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pay_nominal" className={LABEL_CLASS}>
                  Nominal Bayar (Rp)
                </Label>
                <Input
                  id="pay_nominal"
                  name="nominal"
                  defaultValue={bill ? String(Math.max(sisa, 0)) : ""}
                  className={INPUT_CLASS}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metode" className={LABEL_CLASS}>
                  Metode
                </Label>
                <select
                  id="metode"
                  name="metode"
                  required
                  defaultValue="transfer"
                  className={SELECT_CLASS}
                >
                  <option value="transfer">Transfer</option>
                  <option value="tunai">Tunai</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bukti_url" className={LABEL_CLASS}>
                URL Bukti (opsional)
              </Label>
              <Input
                id="bukti_url"
                name="bukti_url"
                placeholder="https://... (tautan gambar bukti transfer)"
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catatan" className={LABEL_CLASS}>
                Catatan (opsional)
              </Label>
              <Input
                id="catatan"
                name="catatan"
                placeholder="Catatan pembayaran"
                className={INPUT_CLASS}
              />
            </div>

            <p className="mt-[19px] border-t border-[#e3ece6] pt-[17px] text-[10px] text-[#8b9f95]">
              Pembayaran berstatus menunggu sampai diverifikasi petugas.
            </p>
          </div>

          <div className={MODAL_FOOTER}>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
              {isSubmitting ? "Menyimpan..." : "Catat Pembayaran"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
