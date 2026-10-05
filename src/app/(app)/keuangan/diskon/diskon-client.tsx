"use client";

import { useCallback, useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
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
import type { DiscountType, StudentDiscount, Siswa } from "@/lib/types";
import { approveStudentDiscount, saveDiscountType, deleteDiscountType, saveStudentDiscount, deleteStudentDiscount } from "./actions";

type FormState = { error?: string; success?: string } | undefined;

const STATUS_LABELS: Record<StudentDiscount["status"], string> = {
  pending: "Menunggu Persetujuan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  berakhir: "Berakhir",
};

export function DiskonClient({
  discountTypes,
  studentDiscounts,
  students,
  canManage,
  canApprove,
}: {
  discountTypes: DiscountType[];
  studentDiscounts: StudentDiscount[];
  students: Siswa[];
  canManage: boolean;
  canApprove: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"types" | "discounts">("types");
  const [statusFilter, setStatusFilter] = useState<"pending" | "disetujui" | "ditolak-berakhir">("pending");
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);

  // Discount type state
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<DiscountType | null>(null);
  const [viewingType, setViewingType] = useState<DiscountType | null>(null);
  const [deletingType, setDeletingType] = useState<DiscountType | null>(null);

  // Student discount state
  const [discFormOpen, setDiscFormOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<StudentDiscount | null>(null);
  const [viewingDisc, setViewingDisc] = useState<StudentDiscount | null>(null);
  const [dialogKeyType, setDialogKeyType] = useState(0);
  const [dialogKeyDisc, setDialogKeyDisc] = useState(0);
  const [deletingDisc, setDeletingDisc] = useState<StudentDiscount | null>(null);

  const closeTypeForm = useCallback(() => setTypeFormOpen(false), []);
  const closeStudentDiscountForm = useCallback(() => setDiscFormOpen(false), []);

  const studentOptions = students.map((s) => ({ value: s.id, label: `${s.nama_lengkap} (${s.nisn ?? s.id})` }));
  const typeOptions = discountTypes.map((t) => ({ value: t.id, label: `${t.code} - ${t.name} (${t.calc_type})` }));
  const pendingCount = studentDiscounts.filter((item) => item.status === "pending").length;
  const visibleStudentDiscounts = studentDiscounts.filter((item) => statusFilter === "ditolak-berakhir" ? item.status === "ditolak" || item.status === "berakhir" : item.status === statusFilter);

  const handleApproval = async (target: StudentDiscount, decision: "disetujui" | "ditolak") => {
    if (!canApprove || processingApproval) return;
    setProcessingApproval(target.id);
    const formData = new FormData();
    formData.append("id", target.id);
    formData.append("decision", decision);
    const result = await approveStudentDiscount(undefined, formData);
    if (result?.success) toast.success(result.success);
    if (result?.error) toast.error(result.error);
    setProcessingApproval(null);
  };

  const handleDeleteType = (target: DiscountType) => {
    if (!canManage) return;
    const formData = new FormData();
    formData.append("id", target.id);
    deleteDiscountType(undefined, formData);
    setDeletingType(null);
  };

  const handleDeleteDisc = (target: StudentDiscount) => {
    if (!canManage) return;
    const formData = new FormData();
    formData.append("id", target.id);
    deleteStudentDiscount(undefined, formData);
    setDeletingDisc(null);
  };

  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">Diskon & Beasiswa</h1>
          <p className="mt-2 text-xs text-[#82978d]">Kelola jenis diskon dan alokasi bantuan biaya siswa.</p>
        </div>
        {canManage ? (
          <Button className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]" onClick={() => {
            if (activeTab === "types") {
              setEditingType(null);
              setTypeFormOpen(true);
            } else {
              setEditingDisc(null);
              setDiscFormOpen(true);
            }
          }}>
            <PlusIcon data-icon="inline-start" className="size-4" />
            {activeTab === "types" ? "Tambah Jenis Diskon" : "Tambah Diskon Siswa"}
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setActiveTab(activeTab === "types" ? "discounts" : "types")}
          className="h-8 rounded-[8px] border-[#e2ece5] bg-white px-3 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
        >
          {activeTab === "types" ? "Diskon Siswa" : "Jenis Diskon"}
        </Button>
      </div>

      {activeTab === "types" ? (
        <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Jenis Diskon</CardTitle>
            <CardDescription className="text-[11px] text-[#8b9f95]">{discountTypes.length} jenis terdaftar</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <FinanceDataTable
              key="discount-types"
              rows={discountTypes}
              rowKey={(item) => item.id}
              search={query}
              onSearchChange={setQuery}
              toolbarClassName="px-6"
              emptyLabel="Belum ada jenis diskon. Tambahkan jenis diskon pertama."
              filteredEmptyLabel="Tidak ada jenis diskon yang cocok dengan pencarian."
              columns={[
                { key: "code", label: "Kode", searchable: true, searchValue: (item) => item.code, sortValue: (item) => item.code, sticky: true, render: (item) => <span className="text-xs font-semibold text-[#2b493e]">{item.code}</span> },
                { key: "name", label: "Nama", searchable: true, searchValue: (item) => item.name, sortValue: (item) => item.name, render: (item) => <span className="block truncate text-xs text-[#3e5c50]" title={item.name}>{item.name}</span> },
                { key: "calculation", label: "Perhitungan", sortValue: (item) => item.calc_type, render: (item) => <span className="text-xs text-[#3e5c50]">{item.calc_type === "percent" ? "Persen" : "Nominal"}</span> },
                { key: "system", label: "Jenis", sortValue: (item) => Number(item.is_system), render: (item) => <span className="text-xs text-[#3e5c50]">{item.is_system ? "Sistem" : "Kustom"}</span> },
              ]}
              onRowClick={setViewingType}
              actions={canManage ? (item) => <div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="Ubah jenis diskon" className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5]" onClick={() => { setEditingType(item); setTypeFormOpen(true); }}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus jenis diskon" className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:border-[#e8bcb4] hover:bg-[#fff7f5]" onClick={() => setDeletingType(item)}><Trash2Icon className="size-4" /></Button></div> : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Diskon Siswa</CardTitle>
            <CardDescription className="text-[11px] text-[#8b9f95]">{studentDiscounts.length} diskon terdaftar</CardDescription>
            <div className="flex flex-wrap gap-2 pt-3">
              {([
                ["pending", "Menunggu Persetujuan", pendingCount],
                ["disetujui", "Disetujui", null],
                ["ditolak-berakhir", "Ditolak / Kadaluarsa", null],
              ] as const).map(([value, label, count]) => (
                <Button key={value} type="button" variant="outline" onClick={() => setStatusFilter(value)} className={statusFilter === value ? "h-8 rounded-[8px] border-[#185743] bg-[#eef6f0] px-3 text-[10px] font-bold text-[#185743]" : "h-8 rounded-[8px] border-[#e2ece5] bg-white px-3 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"}>
                  {label}
                  {count !== null ? <Badge className="ml-1.5 rounded-full bg-[#d96f62] px-1.5 py-0 text-[9px] text-white">{count}</Badge> : null}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <FinanceDataTable
              key="student-discounts"
              rows={visibleStudentDiscounts}
              rowKey={(item) => item.id}
              search={query}
              onSearchChange={setQuery}
              toolbarClassName="px-6"
              emptyLabel="Belum ada diskon siswa. Tambahkan diskon siswa pertama."
              filteredEmptyLabel="Tidak ada diskon siswa yang cocok dengan pencarian."
              columns={[
                { key: "student", label: "Siswa", searchable: true, searchValue: (item) => students.find((student) => student.id === item.student_id)?.nama_lengkap ?? item.student_id, sortValue: (item) => students.find((student) => student.id === item.student_id)?.nama_lengkap ?? item.student_id, sticky: true, render: (item) => <span className="block truncate text-xs font-semibold text-[#2b493e]">{students.find((student) => student.id === item.student_id)?.nama_lengkap ?? item.student_id}</span> },
                { key: "type", label: "Jenis Diskon", searchable: true, searchValue: (item) => discountTypes.find((type) => type.id === item.discount_type_id)?.name ?? item.discount_type_id, sortValue: (item) => discountTypes.find((type) => type.id === item.discount_type_id)?.name ?? item.discount_type_id, render: (item) => <span className="block truncate text-xs text-[#3e5c50]">{discountTypes.find((type) => type.id === item.discount_type_id)?.name ?? item.discount_type_id}</span> },
                { key: "value", label: "Nilai Diskon", sortValue: (item) => Number(item.value), render: (item) => <span className="text-xs font-semibold text-[#2b493e]">{item.value}</span> },
                { key: "start_date", label: "Tanggal Mulai", sortValue: (item) => item.start_date, render: (item) => <span className="text-xs text-[#3e5c50]">{item.start_date?.slice(0, 10)}</span> },
                { key: "end_date", label: "Tanggal Selesai", sortValue: (item) => item.end_date, render: (item) => <span className="text-xs text-[#3e5c50]">{item.end_date?.slice(0, 10)}</span> },
                { key: "status", label: "Status", sortValue: (item) => item.status, render: (item) => <span className="rounded-full bg-[#eef6f0] px-2 py-0.5 text-xs font-medium text-[#2b7254]">{STATUS_LABELS[item.status]}</span> },
              ]}
              onRowClick={setViewingDisc}
               actions={(item) => <div className="flex items-center justify-end gap-1">
                 {canApprove && item.status === "pending" ? <>
                   <Button variant="ghost" size="icon-sm" aria-label="Setujui diskon siswa" disabled={processingApproval === item.id} className="border border-[#b8d6c0] bg-white text-[#2b7254] hover:bg-[#f4faf5]" onClick={() => handleApproval(item, "disetujui")}><CheckIcon className="size-4" /></Button>
                   <Button variant="ghost" size="icon-sm" aria-label="Tolak diskon siswa" disabled={processingApproval === item.id} className="border border-[#e8bcb4] bg-white text-[#ad685d] hover:bg-[#fff7f5]" onClick={() => handleApproval(item, "ditolak")}><XIcon className="size-4" /></Button>
                 </> : null}
                 {canManage ? <><Button variant="ghost" size="icon-sm" aria-label="Ubah diskon siswa" className="border border-[#e1ebe4] bg-white text-[#537467] hover:bg-[#f4faf5]" onClick={() => { setEditingDisc(item); setDiscFormOpen(true); }}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus diskon siswa" className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:bg-[#fff7f5]" onClick={() => setDeletingDisc(item)}><Trash2Icon className="size-4" /></Button></> : null}
               </div>}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(viewingType)} onOpenChange={(open) => !open && setViewingType(null)}>
        <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden rounded-[17px] border-0 bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)] ring-1 ring-[#dbe8df] sm:max-w-[560px]">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Pengelolaan biaya siswa</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Jenis Diskon</DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">{viewingType?.name ?? "-"}</DialogDescription>
          </DialogHeader>
          {viewingType ? (
            <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <DetailItem label="Kode" value={viewingType.code} />
                <DetailItem label="Perhitungan" value={viewingType.calc_type === "percent" ? "Persen" : "Nominal"} />
                <DetailItem label="Jenis" value={viewingType.is_system ? "Sistem" : "Kustom"} />
              </dl>
            </div>
          ) : null}
          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white px-7 py-[15px]">
            <Button type="button" onClick={() => setViewingType(null)} className="h-8 rounded-[9px] border border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingDisc)} onOpenChange={(open) => !open && setViewingDisc(null)}>
        <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden rounded-[17px] border-0 bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)] ring-1 ring-[#dbe8df] sm:max-w-[560px]">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Pengelolaan biaya siswa</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Diskon Siswa</DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">{viewingDisc ? students.find((student) => student.id === viewingDisc.student_id)?.nama_lengkap ?? viewingDisc.student_id : "-"}</DialogDescription>
          </DialogHeader>
          {viewingDisc ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <DetailItem label="Nama Siswa" value={students.find((student) => student.id === viewingDisc.student_id)?.nama_lengkap ?? viewingDisc.student_id} />
                <DetailItem label="Jenis Diskon" value={discountTypes.find((type) => type.id === viewingDisc.discount_type_id)?.name ?? viewingDisc.discount_type_id} />
                <DetailItem label="Nilai Diskon" value={String(viewingDisc.value)} />
                <DetailItem label="Tanggal Mulai" value={viewingDisc.start_date?.slice(0, 10) ?? "-"} />
                <DetailItem label="Tanggal Selesai" value={viewingDisc.end_date?.slice(0, 10) ?? "-"} />
                <DetailItem label="Status" value={STATUS_LABELS[viewingDisc.status]} />
              </dl>
            </div>
          ) : null}
          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white px-7 py-[15px]">
            <Button type="button" onClick={() => setViewingDisc(null)} className="h-8 rounded-[9px] border border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]">Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscountTypeFormDialog
        key={`type-${editingType?.id ?? dialogKeyType}`}
        open={typeFormOpen}
        onOpenChange={(open) => {
          if (open && !editingType) setDialogKeyType(k => k + 1);
          setTypeFormOpen(open);
        }}
        editing={editingType}
        onSaved={closeTypeForm}
      />

      <StudentDiscountFormDialog
        key={`student-discount-${editingDisc?.id ?? dialogKeyDisc}`}
        open={discFormOpen}
        onOpenChange={(open) => {
          if (open && !editingDisc) setDialogKeyDisc(k => k + 1);
          setDiscFormOpen(open);
        }}
        editing={editingDisc}
        studentOptions={studentOptions}
        typeOptions={typeOptions}
        onSaved={closeStudentDiscountForm}
      />

      {/* Delete Type Alert */}
      <AlertDialog open={Boolean(deletingType)} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jenis diskon ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingType ? `Jenis diskon "${deletingType.name}" akan dihapus permanen.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteType(deletingType!)} disabled={!canManage} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Discount Alert */}
      <AlertDialog open={Boolean(deletingDisc)} onOpenChange={() => setDeletingDisc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus diskon ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Diskon siswa akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteDisc(deletingDisc!)} disabled={!canManage} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold tracking-[.04em] text-[#8b9f95] uppercase">{label}</dt><dd className="mt-1 truncate text-xs text-[#2b493e]" title={value}>{value}</dd></div>;
}

function DiscountTypeFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DiscountType | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveDiscountType, undefined);

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
        <form action={formAction} className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Pengelolaan biaya siswa</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">{isEdit ? "Ubah Jenis Diskon" : "Tambah Jenis Diskon"}</DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">Definisikan jenis diskon yang tersedia.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px]">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="code" required>Kode</FieldLabel>
              <Input id="code" name="code" defaultValue={editing?.code ?? ""} placeholder="DISC10" required={!isEdit} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="name" required>Nama</FieldLabel>
              <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder="Diskon 10%" required={!isEdit} />
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="calc_type" required>Perhitungan</FieldLabel>
            <Select name="calc_type" defaultValue={editing?.calc_type ?? "percent"}>
              <SelectTrigger id="calc_type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Persen (%)</SelectItem>
                <SelectItem value="fixed">Nominal (Rp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox id="is_system" name="is_system" defaultChecked={Boolean(editing?.is_system)} disabled />
            <FieldLabel htmlFor="is_system" required>Jenis sistem (hanya bisa diedit admin)</FieldLabel>
          </div>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
            <Button type="button" onClick={() => onOpenChange(false)} className="h-8 rounded-[9px] border border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]">Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="h-8 rounded-[9px] border border-[#185743] bg-[#185743] px-3 text-[10px] font-bold text-white shadow-none hover:border-[#124936] hover:bg-[#124936]">{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudentDiscountFormDialog({
  open,
  onOpenChange,
  editing,
  studentOptions,
  typeOptions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StudentDiscount | null;
  studentOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  onSaved: () => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveStudentDiscount, undefined);

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
        <form action={formAction} className="flex min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">Pengelolaan biaya siswa</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">{isEdit ? "Ubah Diskon Siswa" : "Tambah Diskon Siswa"}</DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">Berikan diskon kepada siswa tertentu.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px]">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <FieldLabel htmlFor="student_id" required>Siswa</FieldLabel>
            <Select name="student_id" defaultValue={editing?.student_id ?? ""}>
              <SelectTrigger id="student_id" className="h-10 w-full rounded-[9px] border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a]"><SelectValue placeholder="Pilih siswa">{(value: string) => studentOptions.find((option) => option.value === value)?.label ?? "Pilih siswa"}</SelectValue></SelectTrigger>
              <SelectContent className="max-h-72 min-w-[var(--anchor-width)] rounded-[9px] border border-[#dfeae3] bg-white p-1 shadow-lg">
                {studentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="min-h-9 whitespace-normal py-2 text-[11px] text-[#36584a]">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="discount_type_id" required>Jenis Diskon</FieldLabel>
            <Select name="discount_type_id" defaultValue={editing?.discount_type_id ?? ""}>
              <SelectTrigger id="discount_type_id" className="h-10 w-full rounded-[9px] border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a]"><SelectValue placeholder="Pilih jenis diskon">{(value: string) => typeOptions.find((option) => option.value === value)?.label ?? "Pilih jenis diskon"}</SelectValue></SelectTrigger>
              <SelectContent className="max-h-72 min-w-[var(--anchor-width)] rounded-[9px] border border-[#dfeae3] bg-white p-1 shadow-lg">
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="min-h-9 whitespace-normal py-2 text-[11px] text-[#36584a]">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="value" required>Nilai Diskon</FieldLabel>
            <Input id="value" name="value" type="number" defaultValue={editing?.value ?? ""} min={0} placeholder="10" required={!isEdit} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FieldLabel htmlFor="start_date" required>Tanggal Mulai</FieldLabel>
              <Input id="start_date" name="start_date" type="date" defaultValue={editing?.start_date?.slice(0, 10) ?? ""} required={!isEdit} />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="end_date" required>Tanggal Selesai</FieldLabel>
              <Input id="end_date" name="end_date" type="date" defaultValue={editing?.end_date?.slice(0, 10) ?? ""} required={!isEdit} />
            </div>
          </div>

          {editing ? <div className="space-y-2"><FieldLabel>Status</FieldLabel><p className="rounded-[9px] border border-[#e2ece5] bg-[#f6faf7] px-3 py-2 text-xs text-[#537467]">{STATUS_LABELS[editing.status]} · status diubah melalui alur persetujuan</p></div> : <p className="rounded-[9px] border border-[#e2ece5] bg-[#f6faf7] px-3 py-2 text-xs text-[#537467]">Pengajuan baru akan berstatus menunggu persetujuan.</p>}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
            <Button type="button" onClick={() => onOpenChange(false)} className="h-8 rounded-[9px] border border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]">Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="h-8 rounded-[9px] border border-[#185743] bg-[#185743] px-3 text-[10px] font-bold text-white shadow-none hover:border-[#124936] hover:bg-[#124936]">{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
