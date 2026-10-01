"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { FinanceDataTable } from "@/components/finance/finance-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { DiscountType, StudentDiscount, Siswa } from "@/lib/types";
import { saveDiscountType, deleteDiscountType, saveStudentDiscount, deleteStudentDiscount } from "./actions";

type FormState = { error?: string; success?: string } | undefined;

const STATUS_LABELS: Record<StudentDiscount["status"], string> = {
  pending: "Pending",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  berakhir: "Berakhir",
};

export function DiskonClient({
  discountTypes,
  studentDiscounts,
  students,
  canManage,
}: {
  discountTypes: DiscountType[];
  studentDiscounts: StudentDiscount[];
  students: Siswa[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"types" | "discounts">("types");

  // Discount type state
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<DiscountType | null>(null);
  const [viewingType, setViewingType] = useState<DiscountType | null>(null);
  const [deletingType, setDeletingType] = useState<DiscountType | null>(null);

  // Student discount state
  const [discFormOpen, setDiscFormOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<StudentDiscount | null>(null);
  const [viewingDisc, setViewingDisc] = useState<StudentDiscount | null>(null);
  const [deletingDisc, setDeletingDisc] = useState<StudentDiscount | null>(null);

  const studentOptions = students.map((s) => ({ value: s.id, label: `${s.nama_lengkap} (${s.nisn ?? s.id})` }));
  const typeOptions = discountTypes.map((t) => ({ value: t.id, label: `${t.code} - ${t.name} (${t.calc_type})` }));

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
          <Button className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]" onClick={() => activeTab === "types" ? setTypeFormOpen(true) : setDiscFormOpen(true)}>
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
              rows={discountTypes}
              rowKey={(item) => item.id}
              search={query}
              onSearchChange={setQuery}
              emptyLabel="Belum ada jenis diskon. Tambahkan jenis diskon pertama."
              filteredEmptyLabel="Tidak ada jenis diskon yang cocok dengan pencarian."
              columns={[
                { key: "code", label: "Kode", searchable: true, searchValue: (item) => item.code, sortValue: (item) => item.code, sticky: true, render: (item) => <span className="text-xs font-semibold text-[#2b493e]">{item.code}</span> },
                { key: "name", label: "Nama", searchable: true, searchValue: (item) => item.name, sortValue: (item) => item.name, render: (item) => <span className="block truncate text-xs text-[#3e5c50]" title={item.name}>{item.name}</span> },
                { key: "calculation", label: "Perhitungan", sortValue: (item) => item.calc_type, render: (item) => <span className="text-xs text-[#3e5c50]">{item.calc_type === "percent" ? "Persen" : "Nominal"}</span> },
                { key: "system", label: "Jenis", sortValue: (item) => Number(item.is_system), render: (item) => <span className="text-xs text-[#3e5c50]">{item.is_system ? "Sistem" : "Kustom"}</span> },
              ]}
              onRowClick={setViewingType}
              actions={canManage ? (item) => <div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="Ubah jenis diskon" className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5]" onClick={() => setEditingType(item)}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus jenis diskon" className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:border-[#e8bcb4] hover:bg-[#fff7f5]" onClick={() => setDeletingType(item)}><Trash2Icon className="size-4" /></Button></div> : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Diskon Siswa</CardTitle>
            <CardDescription className="text-[11px] text-[#8b9f95]">{studentDiscounts.length} diskon terdaftar</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <FinanceDataTable
              rows={studentDiscounts}
              rowKey={(item) => item.id}
              search={query}
              onSearchChange={setQuery}
              emptyLabel="Belum ada diskon siswa. Tambahkan diskon siswa pertama."
              filteredEmptyLabel="Tidak ada diskon siswa yang cocok dengan pencarian."
              columns={[
                { key: "student", label: "Siswa", searchable: true, searchValue: (item) => students.find((student) => student.id === item.student_id)?.nama_lengkap ?? item.student_id, sortValue: (item) => students.find((student) => student.id === item.student_id)?.nama_lengkap ?? item.student_id, sticky: true, render: (item) => <span className="block truncate text-xs font-semibold text-[#2b493e]">{students.find((student) => student.id === item.student_id)?.nama_lengkap ?? item.student_id}</span> },
                { key: "type", label: "Jenis Diskon", searchable: true, searchValue: (item) => discountTypes.find((type) => type.id === item.discount_type_id)?.name ?? item.discount_type_id, sortValue: (item) => discountTypes.find((type) => type.id === item.discount_type_id)?.name ?? item.discount_type_id, render: (item) => <span className="block truncate text-xs text-[#3e5c50]">{discountTypes.find((type) => type.id === item.discount_type_id)?.name ?? item.discount_type_id}</span> },
                { key: "period", label: "Periode", sortValue: (item) => item.start_date, render: (item) => <span className="text-xs text-[#3e5c50]">{item.start_date?.slice(0, 10)} → {item.end_date?.slice(0, 10)}</span> },
                { key: "value", label: "Nilai", sortValue: (item) => Number(item.value), render: (item) => <span className="text-xs font-semibold text-[#2b493e]">{item.value}</span> },
                { key: "status", label: "Status", sortValue: (item) => item.status, render: (item) => <span className="rounded-full bg-[#eef6f0] px-2 py-0.5 text-xs font-medium text-[#2b7254]">{STATUS_LABELS[item.status]}</span> },
              ]}
              onRowClick={setViewingDisc}
              actions={canManage ? (item) => <div className="flex items-center justify-end gap-1"><Button variant="ghost" size="icon-sm" aria-label="Ubah diskon siswa" className="border border-[#e1ebe4] bg-white text-[#537467] hover:bg-[#f4faf5]" onClick={() => setEditingDisc(item)}><PencilIcon className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label="Hapus diskon siswa" className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:bg-[#fff7f5]" onClick={() => setDeletingDisc(item)}><Trash2Icon className="size-4" /></Button></div> : undefined}
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(viewingType)} onOpenChange={(open) => !open && setViewingType(null)}>
        <DialogContent className="border-0 ring-1 ring-[#dbe8df] sm:max-w-[520px] rounded-[17px] bg-[#fbfdfb] p-0">
          <DialogHeader className="border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6"><DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Jenis Diskon</DialogTitle><DialogDescription>{viewingType?.name ?? "-"}</DialogDescription></DialogHeader>
          {viewingType ? <dl className="grid grid-cols-2 gap-4 px-7 py-6"><DetailItem label="Kode" value={viewingType.code} /><DetailItem label="Perhitungan" value={viewingType.calc_type === "percent" ? "Persen" : "Nominal"} /><DetailItem label="Jenis" value={viewingType.is_system ? "Sistem" : "Kustom"} /></dl> : null}
          <DialogFooter className="border-t border-[#e3ece6] bg-white px-7 py-[15px]"><Button variant="outline" onClick={() => setViewingType(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewingDisc)} onOpenChange={(open) => !open && setViewingDisc(null)}>
        <DialogContent className="border-0 ring-1 ring-[#dbe8df] sm:max-w-[520px] rounded-[17px] bg-[#fbfdfb] p-0">
          <DialogHeader className="border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6"><DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]">Detail Diskon Siswa</DialogTitle><DialogDescription>{viewingDisc ? students.find((student) => student.id === viewingDisc.student_id)?.nama_lengkap ?? viewingDisc.student_id : "-"}</DialogDescription></DialogHeader>
          {viewingDisc ? <dl className="grid grid-cols-2 gap-4 px-7 py-6"><DetailItem label="Jenis Diskon" value={discountTypes.find((type) => type.id === viewingDisc.discount_type_id)?.name ?? viewingDisc.discount_type_id} /><DetailItem label="Nilai" value={String(viewingDisc.value)} /><DetailItem label="Periode" value={`${viewingDisc.start_date?.slice(0, 10)} → ${viewingDisc.end_date?.slice(0, 10)}`} /><DetailItem label="Status" value={STATUS_LABELS[viewingDisc.status]} /></dl> : null}
          <DialogFooter className="border-t border-[#e3ece6] bg-white px-7 py-[15px]"><Button variant="outline" onClick={() => setViewingDisc(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscountTypeFormDialog
        key={editingType?.id ?? "new-type"}
        open={typeFormOpen}
        onOpenChange={setTypeFormOpen}
        editing={editingType}
        onSaved={() => setTypeFormOpen(false)}
      />

      <StudentDiscountFormDialog
        key={editingDisc?.id ?? "new-discount"}
        open={discFormOpen}
        onOpenChange={setDiscFormOpen}
        editing={editingDisc}
        studentOptions={studentOptions}
        typeOptions={typeOptions}
        onSaved={() => setDiscFormOpen(false)}
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
        <form action={formAction} className="space-y-4">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <DialogTitle className="text-[21px] font-semibold tracking-[-.05em] text-[#183d32]">{isEdit ? "Ubah Jenis Diskon" : "Tambah Jenis Diskon"}</DialogTitle>
            <DialogDescription>Definisikan jenis diskon yang tersedia.</DialogDescription>
          </DialogHeader>

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
                <SelectItem value="nominal">Nominal (Rp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2.5">
            <Checkbox id="is_system" name="is_system" defaultChecked={Boolean(editing?.is_system)} disabled />
            <FieldLabel htmlFor="is_system" required>Jenis sistem (hanya bisa diedit admin)</FieldLabel>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
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
        <form action={formAction} className="space-y-4">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <DialogTitle className="text-[21px] font-semibold tracking-[-.05em] text-[#183d32]">{isEdit ? "Ubah Diskon Siswa" : "Tambah Diskon Siswa"}</DialogTitle>
            <DialogDescription>Berikan diskon kepada siswa tertentu.</DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div className="space-y-2">
            <FieldLabel htmlFor="student_id" required>Siswa</FieldLabel>
            <Select name="student_id" defaultValue={editing?.student_id ?? ""}>
              <SelectTrigger id="student_id"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
              <SelectContent>
                {studentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="discount_type_id" required>Jenis Diskon</FieldLabel>
            <Select name="discount_type_id" defaultValue={editing?.discount_type_id ?? ""}>
              <SelectTrigger id="discount_type_id"><SelectValue placeholder="Pilih jenis diskon" /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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

          <div className="space-y-2">
            <FieldLabel htmlFor="status" required>Status</FieldLabel>
            <Select name="status" defaultValue={editing?.status ?? "pending"}>
              <SelectTrigger id="status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="disetujui">Disetujui</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
                <SelectItem value="berakhir">Berakhir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
