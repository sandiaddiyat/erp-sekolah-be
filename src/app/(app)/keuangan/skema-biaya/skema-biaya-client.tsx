"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon, TagIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatRupiah } from "@/lib/utils";
import type { FeeCategory, FeeStructure, AcademicYear, Grade, EducationLevel, Major } from "@/lib/types";
import { saveFeeCategory, deleteFeeCategory, saveFeeStructure, deleteFeeStructure } from "./actions";

type FormState = { error?: string; success?: string } | undefined;

const BILLING_CYCLE_LABELS: Record<FeeCategory["billing_cycle"], string> = {
  bulanan: "Bulanan",
  semester: "Semester",
  tahunan: "Tahunan",
  sekali: "Sekali",
};

export function SkemaBiayaClient({
  feeCategories,
  feeStructures,
  academicYears,
  grades,
  educationLevels,
  majors,
  canManage,
}: {
  feeCategories: FeeCategory[];
  feeStructures: FeeStructure[];
  academicYears: AcademicYear[];
  grades: Grade[];
  educationLevels: EducationLevel[];
  majors: Major[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<FeeCategory | null>(null);

  const [structureFormOpen, setStructureFormOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [deletingStructure, setDeletingStructure] = useState<FeeStructure | null>(null);

  const [catState, catAction, catSubmitting] = useActionState<FormState, FormData>(saveFeeCategory, undefined);
  const [structState, structAction, structSubmitting] = useActionState<FormState, FormData>(saveFeeStructure, undefined);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (catState?.success) { toast.success(catState.success); setCategoryFormOpen(false); }
    else if (catState?.error) toast.error(catState.error);
  }, [catState]);

  useEffect(() => {
    if (structState?.success) { toast.success(structState.success); setStructureFormOpen(false); }
    else if (structState?.error) toast.error(structState.error);
  }, [structState]);

  const filteredCategories = feeCategories.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const filteredStructures = feeStructures.filter((s) => {
    const cat = feeCategories.find((c) => c.id === s.fee_category_id);
    const text = (cat?.name ?? "") + " " + (s.amount ?? "");
    return text.toLowerCase().includes(query.toLowerCase());
  });

  const yearOptions = academicYears.map((y) => ({ value: y.id, label: y.name }));
  const gradeOptions = grades.map((g) => ({ value: g.id, label: g.name }));
  const majorOptions = majors.map((m) => ({ value: m.id, label: m.name }));
  const categoryOptions = feeCategories.map((c) => ({ value: c.id, label: c.name }));

  const handleDeleteCategory = (target: FeeCategory) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteFeeCategory(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeletingCategory(null);
    });
  };

  const handleDeleteStructure = (target: FeeStructure) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteFeeStructure(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeletingStructure(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Skema Biaya</h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori biaya dan skema tarif per jenjang/tingkat/jurusan.
          </p>
        </div>
        <div className="relative w-64">
          <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari..." className="pl-8" />
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <TabsList>
          <TabsTrigger value="categories">Kategori Biaya</TabsTrigger>
          <TabsTrigger value="structures">Skema Tarif</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          {canManage && (
            <Button size="sm" onClick={() => { setEditingCategory(null); setCategoryFormOpen(true); }}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Kategori
            </Button>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Kategori Biaya</CardTitle>
              <CardDescription>{filteredCategories.length} dari {feeCategories.length} kategori</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {filteredCategories.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <TagIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium">Belum ada kategori biaya</p>
                  <p className="text-sm text-muted-foreground mt-1">Tambahkan kategori biaya untuk mulai.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCategories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{BILLING_CYCLE_LABELS[cat.billing_cycle]}</p>
                        {cat.description ? <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p> : null}
                      </div>
                      {canManage ? (
                        <div className="flex shrink-0 gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditingCategory(cat); setCategoryFormOpen(true); }}>Ubah</Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingCategory(cat)}>Hapus</Button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="structures" className="space-y-4">
          {canManage && (
            <Button size="sm" onClick={() => { setEditingStructure(null); setStructureFormOpen(true); }}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Tambah Skema Tarif
            </Button>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Skema Tarif</CardTitle>
              <CardDescription>{filteredStructures.length} dari {feeStructures.length} skema tarif</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {filteredStructures.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <ListIcon className="mx-auto h-10 w-10 text-muted-foreground/40" />
                  <p className="mt-2 text-sm font-medium">Belum ada skema tarif</p>
                  <p className="text-sm text-muted-foreground mt-1">Tambahkan skema tarif biaya.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredStructures.map((s) => {
                    const cat = feeCategories.find((c) => c.id === s.fee_category_id);
                    const year = academicYears.find((y) => y.id === s.academic_year_id);
                    const grade = grades.find((g) => g.id === s.grade_id);
                    const major = majors.find((m) => m.id === s.major_id);
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-3 px-6 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{cat?.name ?? "-"}</p>
                          <p className="text-xs text-muted-foreground">
                            {year?.name ?? "-"} · {grade?.name ?? "-"}
                            {major ? ` · ${major.name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatRupiah(Number(s.amount))} · Jatuh tempo: {s.due_day ?? "-"}
                          </p>
                        </div>
                        {canManage ? (
                          <div className="flex shrink-0 gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setEditingStructure(s); setStructureFormOpen(true); }}>Ubah</Button>
                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeletingStructure(s)}>Hapus</Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fee Category FormDialog */}
      <Dialog open={categoryFormOpen} onOpenChange={setCategoryFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={catAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingCategory ? "Ubah Kategori" : "Tambah Kategori"}</DialogTitle>
              <DialogDescription>Definisikan jenis biaya yang tersedia.</DialogDescription>
            </DialogHeader>

            {editingCategory ? <input type="hidden" name="id" value={editingCategory.id} /> : null}

            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori</Label>
              <Input id="name" name="name" defaultValue={editingCategory?.name ?? ""} placeholder="SPP, Seragaman, dll." required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_cycle">Frekuensi Tagih</Label>
              <Select name="billing_cycle" defaultValue={editingCategory?.billing_cycle ?? "bulanan"}>
                <SelectTrigger id="billing_cycle"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="tahunan">Tahunan</SelectItem>
                  <SelectItem value="sekali">Sekali</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <Input id="description" name="description" defaultValue={editingCategory?.description ?? ""} placeholder="Deskripsi kategori biaya" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={catSubmitting}>{catSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fee Structure FormDialog */}
      <Dialog open={structureFormOpen} onOpenChange={setStructureFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={structAction} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{editingStructure ? "Ubah Skema Tarif" : "Tambah Skema Tarif"}</DialogTitle>
              <DialogDescription>Atur tarif berdasarkan tahun ajaran, jenjang, tingkat, dan jurusan.</DialogDescription>
            </DialogHeader>

            {editingStructure ? <input type="hidden" name="id" value={editingStructure.id} /> : null}

            <div className="space-y-2">
              <Label htmlFor="fee_category_id">Kategori Biaya</Label>
              <Select name="fee_category_id" defaultValue={editingStructure?.fee_category_id ?? ""}>
                <SelectTrigger id="fee_category_id"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year_id">Tahun Ajaran</Label>
              <Select name="academic_year_id" defaultValue={editingStructure?.academic_year_id ?? ""}>
                <SelectTrigger id="academic_year_id"><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade_id">Tingkat</Label>
              <Select name="grade_id" defaultValue={editingStructure?.grade_id ?? ""}>
                <SelectTrigger id="grade_id"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                <SelectContent>
                  {gradeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="major_id">Jurusan (opsional)</Label>
              <Select name="major_id" defaultValue={editingStructure?.major_id ?? ""}>
                <SelectTrigger id="major_id"><SelectValue placeholder="- tidak ada -" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">- tidak ada -</SelectItem>
                  {majorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Nominal</Label>
                <Input id="amount" name="amount" defaultValue={editingStructure?.amount?.toString() ?? ""} placeholder="500000" required={!editingStructure} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due_day">Hari Jatuh Tempo</Label>
                <Input id="due_day" name="due_day" type="number" defaultValue={editingStructure?.due_day ?? ""} min={1} max={28} placeholder="1-28" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStructureFormOpen(false)}>Batal</Button>
              <Button type="submit" disabled={structSubmitting}>{structSubmitting ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Category Alert */}
      <AlertDialog open={Boolean(deletingCategory)} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCategory ? `${deletingCategory.name} akan dihapus permanen. Skema tarif yang memakai kategori ini akan rusak.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteCategory(deletingCategory!)} disabled={isPending} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Structure Alert */}
      <AlertDialog open={Boolean(deletingStructure)} onOpenChange={() => setDeletingStructure(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus skema tarif ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Skema tarif yang sudah dipilih akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteStructure(deletingStructure!)} disabled={isPending} className="bg-destructive text-white">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
