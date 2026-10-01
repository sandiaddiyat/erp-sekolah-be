"use client";

import { useEffect, useState, useActionState } from "react";
import { toast } from "sonner";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { DiscountType, StudentDiscount, Siswa, FeeCategory } from "@/lib/types";
import { saveDiscountType, deleteDiscountType, saveStudentDiscount, deleteStudentDiscount } from "./actions";

type FormState = { error?: string; success?: string } | undefined;

const STATUS_VARIANT: Record<StudentDiscount["status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending: "default",
  disetujui: "secondary",
  ditolak: "destructive",
  berakhir: "outline",
};

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
  feeCategories,
  canManage,
}: {
  discountTypes: DiscountType[];
  studentDiscounts: StudentDiscount[];
  students: Siswa[];
  feeCategories: FeeCategory[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"types" | "discounts">("types");

  // Discount type state
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<DiscountType | null>(null);
  const [deletingType, setDeletingType] = useState<DiscountType | null>(null);
  const [typeState, typeAction, typeSubmitting] = useActionState<FormState, FormData>(saveDiscountType, undefined);

  // Student discount state
  const [discFormOpen, setDiscFormOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<StudentDiscount | null>(null);
  const [deletingDisc, setDeletingDisc] = useState<StudentDiscount | null>(null);
  const [discState, discAction, discSubmitting] = useActionState<FormState, FormData>(saveStudentDiscount, undefined);

  useEffect(() => {
    if (typeState?.success) { toast.success(typeState.success); setTypeFormOpen(false); }
    else if (typeState?.error) toast.error(typeState.error);
  }, [typeState]);

  useEffect(() => {
    if (discState?.success) { toast.success(discState.success); setDiscFormOpen(false); }
    else if (discState?.error) toast.error(discState.error);
  }, [discState]);

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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Diskon & Beasiswa</h1>
          <p className="text-sm text-muted-foreground">
            Kelola jenis diskon dan alokasi ke siswa.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" variant={activeTab === "types" ? "default" : "outline"} onClick={() => setActiveTab("types")}>
              Jenis Diskon
            </Button>
            <Button size="sm" variant={activeTab === "discounts" ? "default" : "outline"} onClick={() => setActiveTab("discounts")}>
              Diskon Siswa
            </Button>
          </div>
        )}
      </div>

      <div className="relative w-64">
        <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari..." className="pl-8" />
      </div>

      {activeTab === "types" ? (
        <Card>
          <CardHeader>
            <CardTitle>Jenis Diskon</CardTitle>
            <CardDescription>{filteredTypes.length} dari {discountTypes.length} jenis</CardDescription>
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
                  <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
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
        <Card>
          <CardHeader>
            <CardTitle>Diskon Siswa</CardTitle>
            <CardDescription>{filteredDiscounts.length} dari {studentDiscounts.length} diskon</CardDescription>
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
                    <div key={item.id} className="flex items-center justify-between gap-3 px-6 py-3">
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

      {/* Discount Type Form */}
      <Dialog open={typeFormOpen} onOpenChange={setTypeFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={typeAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingType ? "Ubah Jenis Diskon" : "Tambah Jenis Diskon"}</DialogTitle>
              <DialogDescription>Definisikan jenis diskon yang tersedia.</DialogDescription>
            </DialogHeader>

            {editingType ? <input type="hidden" name="id" value={editingType.id} /> : null}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="code" required>Kode</FieldLabel>
                <Input id="code" name="code" defaultValue={editingType?.code ?? ""} placeholder="DISC10" required />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="name" required>Nama</FieldLabel>
                <Input id="name" name="name" defaultValue={editingType?.name ?? ""} placeholder="Diskon 10%" required />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="calc_type" required>Perhitungan</FieldLabel>
              <Select name="calc_type" defaultValue={editingType?.calc_type ?? "percent"}>
                <SelectTrigger id="calc_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Persen (%)</SelectItem>
                  <SelectItem value="nominal">Nominal (Rp)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2.5">
              <Checkbox id="is_system" name="is_system" defaultChecked={Boolean(editingType?.is_system)} disabled />
              <FieldLabel htmlFor="is_system" required>Jenis sistem (hanya bisa diedit admin)</FieldLabel>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTypeFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={typeSubmitting}>{typeSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Discount Form */}
      <Dialog open={discFormOpen} onOpenChange={setDiscFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={discAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingDisc ? "Ubah Diskon Siswa" : "Tambah Diskon Siswa"}</DialogTitle>
              <DialogDescription>Berikan diskon kepada siswa tertentu.</DialogDescription>
            </DialogHeader>

            {editingDisc ? <input type="hidden" name="id" value={editingDisc.id} /> : null}

            <div className="space-y-2">
              <FieldLabel htmlFor="student_id" required>Siswa</FieldLabel>
              <Select name="student_id" defaultValue={editingDisc?.student_id ?? ""}>
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
              <Select name="discount_type_id" defaultValue={editingDisc?.discount_type_id ?? ""}>
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
              <Input id="value" name="value" type="number" defaultValue={editingDisc?.value ?? ""} min={0} placeholder="10" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="start_date" required>Tanggal Mulai</FieldLabel>
                <Input id="start_date" name="start_date" type="date" defaultValue={editingDisc?.start_date?.slice(0, 10) ?? ""} required />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="end_date" required>Tanggal Selesai</FieldLabel>
                <Input id="end_date" name="end_date" type="date" defaultValue={editingDisc?.end_date?.slice(0, 10) ?? ""} required />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="status" required>Status</FieldLabel>
              <Select name="status" defaultValue={editingDisc?.status ?? "pending"}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="disetujui">Disetujui</SelectItem>
                  <SelectItem value="ditolak">Ditolak</SelectItem>
                  <SelectItem value="berakhir">Berakhir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDiscFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={discSubmitting}>{discSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
