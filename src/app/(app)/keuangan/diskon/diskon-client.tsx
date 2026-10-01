"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon } from "lucide-react";
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
  const [deletingType, setDeletingType] = useState<DiscountType | null>(null);

  // Student discount state
  const [discFormOpen, setDiscFormOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<StudentDiscount | null>(null);
  const [deletingDisc, setDeletingDisc] = useState<StudentDiscount | null>(null);

  const filteredTypes = discountTypes.filter((t) =>
    (t.code + " " + t.name).toLowerCase().includes(query.toLowerCase())
  );

  const filteredDiscounts = studentDiscounts.filter((d) => {
    const studentName = students.find((s) => s.id === d.student_id)?.nama_lengkap ?? "";
    return studentName.toLowerCase().includes(query.toLowerCase()) ||
      d.discount_type_id.toLowerCase().includes(query.toLowerCase());
  });

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
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari data diskon..." className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder:text-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10" />
        </div>
      </div>

      {activeTab === "types" ? (
        <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Jenis Diskon</CardTitle>
            <CardDescription className="text-[11px] text-[#8b9f95]">{filteredTypes.length} dari {discountTypes.length} jenis</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {filteredTypes.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium">Belum ada jenis diskon</p>
                <p className="text-sm text-muted-foreground mt-1">Tambahkan jenis diskon pertama.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredTypes.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.code} · {item.calc_type === "percent" ? "Persen" : "Nominal"}
                        {item.is_system ? " · Sistem" : ""}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingType(item)}>Ubah</Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingType(item)}>Hapus</Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
          <CardHeader>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">Diskon Siswa</CardTitle>
            <CardDescription className="text-[11px] text-[#8b9f95]">{filteredDiscounts.length} dari {studentDiscounts.length} diskon</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {filteredDiscounts.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-medium">Belum ada diskon siswa</p>
                <p className="text-sm text-muted-foreground mt-1">Tambahkan diskon siswa pertama.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredDiscounts.map((item) => {
                  const student = students.find((s) => s.id === item.student_id);
                  const dtype = discountTypes.find((t) => t.id === item.discount_type_id);
                  return (
                    <div key={item.id} className="group flex items-center justify-between gap-3 border-b border-[#f0f5f1] px-6 py-3 transition-colors last:border-b-0 hover:bg-[#f6fbf7]">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{student?.nama_lengkap ?? item.student_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {dtype?.name ?? item.discount_type_id} · {item.start_date?.slice(0, 10)} → {item.end_date?.slice(0, 10)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.status === "disetujui" ? "bg-[#e7f5e9] text-[#2b7254]" :
                          item.status === "ditolak" ? "bg-[#fdf0ee] text-[#ad685d]" :
                          item.status === "berakhir" ? "bg-[#eef1ef] text-[#6b7a72]" :
                          "bg-[#e8f2f5] text-[#3a7591]"
                        }`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                        {canManage ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => setEditingDisc(item)}>Ubah</Button>
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingDisc(item)}>Hapus</Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
