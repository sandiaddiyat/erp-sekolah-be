"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatRupiah } from "@/lib/utils";
import type { AcademicYear, Invoice, BillingRunLog, InvoiceDetail, FeeStructure, FeeCategory } from "@/lib/types";
import { runGenerateInvoices } from "./actions";

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
  const [runOpen, setRunOpen] = useState(false);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(runGenerateInvoices, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setRunOpen(false);
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  const activeYears = academicYears.filter((y) => y.status === "active");
  const yearOptions = activeYears.length > 0 ? activeYears : academicYears;

  const filtered = invoices.filter((inv) =>
    (inv.student_id ?? "").toLowerCase().includes(query.toLowerCase()) ||
    inv.period_label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Tagihan Otomatis</h1>
          <p className="text-sm text-muted-foreground">
            Generate tagihan secara otomatis berdasarkan skema biaya dan data akademik.
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setRunOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Generate Tagihan
          </Button>
        ) : null}
      </div>

      {/* Generate Dialog */}
      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={formAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Generate Tagihan Otomatis</DialogTitle>
              <DialogDescription>
                Buat tagihan untuk semua siswa yang terdaftar pada tahun ajaran ini.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="academic_year_id">Tahun Ajaran</Label>
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
              <Label htmlFor="period_label">Periode Tagihan</Label>
              <Input id="period_label" name="period_label" placeholder="Sep 2025 / Bulanan" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Tanggal Jatuh Tempo</Label>
              <Input id="due_date" name="due_date" type="date" required />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="only_without_invoice" value="on" className="rounded border-gray-300" />
              <span className="text-sm">Hanya siswa yang belum punya tagihan (idempotent)</span>
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRunOpen(false)} disabled={isSubmitting}>Batal</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Billing Run Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Job Billing</CardTitle>
          <CardDescription>{billingRuns.length} job pernah dijalankan</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {billingRuns.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-muted-foreground">
              Belum ada job billing yang dijalankan.
            </div>
          ) : (
            <div className="divide-y">
              {billingRuns.map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div>
                    <p className="text-sm font-medium">{log.period_label}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.run_at).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${
                      log.status === "selesai" ? "text-emerald-700" :
                      log.status === "gagal" ? "text-red-700" :
                      "text-blue-700"
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
      <Card>
        <CardHeader>
          <CardTitle>Daftar Tagihan</CardTitle>
          <CardDescription>{filtered.length} tagihan ditemukan</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">Belum ada tagihan</p>
              <p className="text-sm text-muted-foreground mt-1">
                Jalankan job generate tagihan untuk membuat tagihan otomatis.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{inv.period_label}</p>
                    <p className="text-xs text-muted-foreground">
                      Siswa #{inv.student_id} · {inv.issue_date?.slice(0, 10)} → {inv.due_date?.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatRupiah(Number(inv.total_amount))}</span>
                    <Badge variant={STATUS_VARIANT[inv.status as Invoice["status"]]}>
                      {STATUS_LABELS[inv.status as Invoice["status"]]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
