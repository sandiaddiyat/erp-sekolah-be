"use client";

import { useCallback, useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  ListIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TablePaginationControls } from "@/components/ui/table-pagination";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import { formatRupiah } from "@/lib/utils";
import type { AcademicYear, EducationLevel, FeeCategory, FeeStructure, Grade, Major } from "@/lib/types";
import { saveFeeCategory, saveFeeStructure, deleteFeeCategory, deleteFeeStructure } from "./actions";

type FormState = { error?: string; success?: string } | undefined;
type TabValue = "categories" | "structures";

type CategoryColumnKey = "name" | "billing_cycle" | "description";
type StructureColumnKey =
  | "fee_category_id"
  | "academic_year_id"
  | "education_level_id"
  | "grade_id"
  | "major_id"
  | "amount"
  | "due_day";

const CATEGORY_COLUMNS: { key: CategoryColumnKey; label: string }[] = [
  { key: "name", label: "Nama Kategori" },
  { key: "billing_cycle", label: "Frekuensi Tagih" },
  { key: "description", label: "Deskripsi" },
];

const STRUCTURE_COLUMNS: { key: StructureColumnKey; label: string }[] = [
  { key: "fee_category_id", label: "Kategori Biaya" },
  { key: "academic_year_id", label: "Tahun Ajaran" },
  { key: "education_level_id", label: "Jenjang" },
  { key: "grade_id", label: "Tingkat" },
  { key: "major_id", label: "Jurusan" },
  { key: "amount", label: "Nominal" },
  { key: "due_day", label: "Jatuh Tempo" },
];

const BILLING_CYCLE_LABELS: Record<FeeCategory["billing_cycle"], string> = {
  bulanan: "Bulanan",
  semester: "Semester",
  tahunan: "Tahunan",
  sekali: "Sekali",
};

const SEARCH_SCOPE_CLASS =
  "absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]";
const SEARCH_SCOPE_TITLE_CLASS =
  "text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase";
const SEARCH_SCOPE_CHIP_CLASS =
  "rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]";
const SEARCH_SCOPE_HINT_CLASS = "mt-2.5 text-[10px] leading-relaxed text-[#8b9f95]";
const SEARCH_INPUT_CLASS =
  "h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder:text-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10";
const COLUMNS_TRIGGER_CLASS =
  "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[12px] border border-[#e2ece5] bg-white px-2.5 text-[0.8rem] font-medium text-[#537467] transition-all outline-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const FORM_INPUT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";
const FORM_SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";
const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

const STICKY_FIRST_HEAD_CLASS =
  "sticky left-0 z-20 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a]";
const STICKY_FIRST_CELL_CLASS =
  "sticky left-0 z-10 bg-white px-3.5 py-3 pl-6 align-middle shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]";
const STICKY_ACTION_HEAD_CLASS =
  "sticky right-0 z-20 w-10 bg-white pr-6 text-right shadow-[-8px_0_8px_-8px_#1c44331a]";
const STICKY_ACTION_CELL_CLASS =
  "sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]";
const SORTABLE_HEAD_CLASS =
  "px-3.5 py-2.5 text-[10px] font-bold whitespace-nowrap text-[#6c8279] cursor-pointer select-none hover:text-[#2b7254]";

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
  const [activeTab, setActiveTab] = useState<TabValue>("categories");
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<FeeCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<FeeCategory | null>(null);
  const [categoryFormKey, setCategoryFormKey] = useState(0);

  const [structureFormOpen, setStructureFormOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [viewingStructure, setViewingStructure] = useState<FeeStructure | null>(null);
  const [deletingStructure, setDeletingStructure] = useState<FeeStructure | null>(null);
  const [structureFormKey, setStructureFormKey] = useState(0);

  const categoryNameById = useMemo(
    () => new Map(feeCategories.map((category) => [category.id, category.name])),
    [feeCategories]
  );
  const yearNameById = useMemo(
    () => new Map(academicYears.map((year) => [year.id, year.name])),
    [academicYears]
  );
  const levelNameById = useMemo(
    () => new Map(educationLevels.map((level) => [level.id, level.name])),
    [educationLevels]
  );
  const gradeNameById = useMemo(
    () => new Map(grades.map((grade) => [grade.id, grade.name])),
    [grades]
  );
  const majorNameById = useMemo(
    () => new Map(majors.map((major) => [major.id, major.name])),
    [majors]
  );

  const openCreateCategory = () => {
    setBanner(null);
    setEditingCategory(null);
    setCategoryFormKey((k) => k + 1);
    setCategoryFormOpen(true);
  };

  const openEditCategory = (category: FeeCategory) => {
    setBanner(null);
    setEditingCategory(category);
    setCategoryFormKey((k) => k + 1);
    setCategoryFormOpen(true);
  };

  const openCreateStructure = () => {
    setBanner(null);
    setEditingStructure(null);
    setStructureFormKey((k) => k + 1);
    setStructureFormOpen(true);
  };

  const openEditStructure = (structure: FeeStructure) => {
    setBanner(null);
    setEditingStructure(structure);
    setStructureFormKey((k) => k + 1);
    setStructureFormOpen(true);
  };

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;
    const target = deletingCategory;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteFeeCategory(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) setBanner(result.success);
      setDeletingCategory(null);
    });
  };

  const handleDeleteStructure = () => {
    if (!deletingStructure) return;
    const target = deletingStructure;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteFeeStructure(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) setBanner(result.success);
      setDeletingStructure(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4c9a77] uppercase">
            Keuangan
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">
            Skema Biaya
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola kategori biaya dan skema tarif per jenjang, tingkat, dan jurusan.
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={activeTab === "categories" ? openCreateCategory : openCreateStructure}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <PlusIcon data-icon="inline-start" className="size-4" />
            {activeTab === "categories" ? "Tambah Kategori" : "Tambah Skema Tarif"}
          </Button>
        ) : null}
      </div>

      {banner ? (
        <div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">
          {banner}
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
        <TabsList
          variant="line"
          className="w-full justify-start gap-0.5 rounded-none border-b border-[#e5eee8] bg-transparent p-0 group-data-horizontal/tabs:h-auto"
        >
          <TabsTrigger
            value="categories"
            className="h-auto flex-none rounded-none border-0 bg-transparent px-4 py-[13px] text-[11px] font-bold text-[#83988e] after:bottom-0 after:bg-[#185743] hover:bg-[#f6fbf7] hover:text-[#2b7254] focus-visible:ring-0 focus-visible:outline-none data-active:text-[#185743] dark:bg-transparent dark:text-[#83988e] dark:data-active:text-[#185743] dark:data-active:border-transparent"
          >
            Kategori Biaya
          </TabsTrigger>
          <TabsTrigger
            value="structures"
            className="h-auto flex-none rounded-none border-0 bg-transparent px-4 py-[13px] text-[11px] font-bold text-[#83988e] after:bottom-0 after:bg-[#185743] hover:bg-[#f6fbf7] hover:text-[#2b7254] focus-visible:ring-0 focus-visible:outline-none data-active:text-[#185743] dark:bg-transparent dark:text-[#83988e] dark:data-active:text-[#185743] dark:data-active:border-transparent"
          >
            Skema Tarif
          </TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="pt-4">
          <CategorySection
            categories={feeCategories}
            canManage={canManage}
            onView={setViewingCategory}
            onEdit={openEditCategory}
            onDelete={setDeletingCategory}
          />
        </TabsContent>

        <TabsContent value="structures" className="pt-4">
          <StructureSection
            structures={feeStructures}
            canManage={canManage}
            categoryNameById={categoryNameById}
            yearNameById={yearNameById}
            levelNameById={levelNameById}
            gradeNameById={gradeNameById}
            majorNameById={majorNameById}
            onView={setViewingStructure}
            onEdit={openEditStructure}
            onDelete={setDeletingStructure}
          />
        </TabsContent>
      </Tabs>

      <CategoryDetailDialog category={viewingCategory} onClose={() => setViewingCategory(null)} />
      <StructureDetailDialog
        structure={viewingStructure}
        onClose={() => setViewingStructure(null)}
        categoryName={viewingStructure ? categoryNameById.get(viewingStructure.fee_category_id) : undefined}
        yearName={viewingStructure ? yearNameById.get(viewingStructure.academic_year_id) : undefined}
        levelName={viewingStructure ? levelNameById.get(viewingStructure.education_level_id) : undefined}
        gradeName={viewingStructure ? gradeNameById.get(viewingStructure.grade_id) : undefined}
        majorName={viewingStructure && viewingStructure.major_id ? majorNameById.get(viewingStructure.major_id) : undefined}
      />

      {canManage ? (
        <>
          <CategoryFormDialog
            key={`category-form-${editingCategory?.id ?? "new"}-${categoryFormKey}`}
            open={categoryFormOpen}
            onOpenChange={setCategoryFormOpen}
            editing={editingCategory}
            onSaved={(message) => {
              setBanner(message);
              setCategoryFormOpen(false);
            }}
          />

          <StructureFormDialog
            key={`structure-form-${editingStructure?.id ?? "new"}-${structureFormKey}`}
            open={structureFormOpen}
            onOpenChange={setStructureFormOpen}
            editing={editingStructure}
            categories={feeCategories}
            academicYears={academicYears}
            educationLevels={educationLevels}
            grades={grades}
            majors={majors}
            onSaved={(message) => {
              setBanner(message);
              setStructureFormOpen(false);
            }}
          />

          <AlertDialog
            open={Boolean(deletingCategory)}
            onOpenChange={(open) => !open && setDeletingCategory(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus kategori biaya ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deletingCategory
                    ? `${deletingCategory.name} akan dihapus permanen. Skema tarif yang memakai kategori ini ikut terhapus.`
                    : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteCategory}
                  disabled={isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={Boolean(deletingStructure)}
            onOpenChange={(open) => !open && setDeletingStructure(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus skema tarif ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deletingStructure
                    ? `Skema tarif ${categoryNameById.get(deletingStructure.fee_category_id) ?? "-"} untuk ${yearNameById.get(deletingStructure.academic_year_id) ?? "-"} akan dihapus permanen.`
                    : ""}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteStructure}
                  disabled={isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}

function CategorySection({
  categories,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  categories: FeeCategory[];
  canManage: boolean;
  onView: (category: FeeCategory) => void;
  onEdit: (category: FeeCategory) => void;
  onDelete: (category: FeeCategory) => void;
}) {
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<CategoryColumnKey>>(
    () => new Set(CATEGORY_COLUMNS.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<CategoryColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) =>
      (category.name + " " + BILLING_CYCLE_LABELS[category.billing_cycle] + " " + (category.description ?? ""))
        .toLowerCase()
        .includes(q)
    );
  }, [categories, query]);

  const sorted = useMemo(() => {
    const getValue = (category: FeeCategory): string => {
      if (sortColumn === "billing_cycle") return BILLING_CYCLE_LABELS[category.billing_cycle];
      if (sortColumn === "description") return category.description ?? "";
      return category.name;
    };
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      return getValue(a).localeCompare(getValue(b), "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sortColumn, sortDirection]);

  const visibleColumnList = CATEGORY_COLUMNS.filter((col) => visibleColumns.has(col.key));
  const { safePage, safeTotalPages, rangeStart, rangeEnd, pageRows } = usePagination(sorted, page, pageSize);

  return (
    <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-[#21483b]">Kategori Biaya</CardTitle>
          <CardDescription className="text-[#8b9f95]">
            {sorted.length} dari {categories.length} kategori biaya
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            isFocused={isSearchFocused}
            onFocusChange={setIsSearchFocused}
            placeholder="Cari kategori biaya..."
            scope={CATEGORY_COLUMNS.map((col) => col.label)}
          />
          <ColumnsToggle
            columns={CATEGORY_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={(key) =>
              setVisibleColumns((prev) => {
                const next = new Set(prev);
                if (next.has(key)) {
                  if (next.size === 1) return prev;
                  next.delete(key);
                } else {
                  next.add(key);
                }
                return next;
              })
            }
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                {visibleColumnList.map((col) => (
                  <SortableHead
                    key={col.key}
                    label={col.label}
                    isSorted={sortColumn === col.key}
                    sortDirection={sortDirection}
                    onSort={() => {
                      if (sortColumn === col.key) {
                        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortColumn(col.key);
                        setSortDirection("asc");
                      }
                    }}
                    className={
                      col.key === "name" ? `${SORTABLE_HEAD_CLASS} ${STICKY_FIRST_HEAD_CLASS}` : SORTABLE_HEAD_CLASS
                    }
                  />
                ))}
                <TableHead className={`${SORTABLE_HEAD_CLASS} ${STICKY_ACTION_HEAD_CLASS}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnList.length + 1}
                    className="h-32 border-b border-[#f0f5f1] px-3.5 py-3 text-center text-xs text-[#a0afa8]"
                  >
                    {query ? (
                      <p className="text-sm text-[#a0afa8]">
                        Tidak ada kategori biaya yang cocok dengan pencarian.
                      </p>
                    ) : (
                      <div className="py-6">
                        <TagIcon className="mx-auto size-10 text-[#c3d3cb]" />
                        <p className="mt-2 text-sm font-medium text-[#3e5c50]">Belum ada kategori biaya</p>
                        <p className="text-sm text-[#a0afa8]">
                          {canManage
                            ? "Tambahkan kategori biaya pertama untuk mulai."
                            : "Hubungi admin sekolah untuk menambahkan data."}
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((category) => (
                  <TableRow
                    key={category.id}
                    className="group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
                    onClick={() => onView(category)}
                  >
                    {visibleColumnList.map((col) => (
                      <CategoryCell key={col.key} columnKey={col.key} category={category} />
                    ))}
                    <TableCell className={STICKY_ACTION_CELL_CLASS}>
                      {canManage ? (
                        <RowActions
                          onEdit={() => onEdit(category)}
                          onDelete={() => onDelete(category)}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            total={sorted.length}
            unit="kategori biaya"
            safePage={safePage}
            safeTotalPages={safeTotalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onPageChange={setPage}
            inputId="kategori-biaya-page-size"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryCell({
  columnKey,
  category,
}: {
  columnKey: CategoryColumnKey;
  category: FeeCategory;
}) {
  if (columnKey === "name") {
    return (
      <TableCell className={STICKY_FIRST_CELL_CLASS}>
        <span className="block truncate text-[12px] font-semibold text-[#2b493e]" title={category.name}>
          {category.name}
        </span>
      </TableCell>
    );
  }

  if (columnKey === "billing_cycle") {
    return (
      <TableCell className="px-3.5 py-3 align-middle">
        <span className="inline-flex items-center rounded-full bg-[#eef6f0] px-2.5 py-0.5 text-[10px] font-semibold text-[#4b8669]">
          {BILLING_CYCLE_LABELS[category.billing_cycle]}
        </span>
      </TableCell>
    );
  }

  return (
    <TableCell className="px-3.5 py-3 align-middle">
      <span className="block max-w-[280px] truncate text-xs text-[#3e5c50]" title={category.description ?? undefined}>
        {category.description || "-"}
      </span>
    </TableCell>
  );
}

function StructureSection({
  structures,
  canManage,
  categoryNameById,
  yearNameById,
  levelNameById,
  gradeNameById,
  majorNameById,
  onView,
  onEdit,
  onDelete,
}: {
  structures: FeeStructure[];
  canManage: boolean;
  categoryNameById: Map<string, string>;
  yearNameById: Map<string, string>;
  levelNameById: Map<string, string>;
  gradeNameById: Map<string, string>;
  majorNameById: Map<string, string>;
  onView: (structure: FeeStructure) => void;
  onEdit: (structure: FeeStructure) => void;
  onDelete: (structure: FeeStructure) => void;
}) {
  const [query, setQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Set<StructureColumnKey>>(
    () => new Set(STRUCTURE_COLUMNS.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<StructureColumnKey>("fee_category_id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getValue = useCallback(
    (structure: FeeStructure): string | number => {
      switch (sortColumn) {
        case "academic_year_id":
          return yearNameById.get(structure.academic_year_id) ?? "";
        case "education_level_id":
          return levelNameById.get(structure.education_level_id) ?? "";
        case "grade_id":
          return gradeNameById.get(structure.grade_id) ?? "";
        case "major_id":
          return structure.major_id ? majorNameById.get(structure.major_id) ?? "" : "";
        case "amount":
          return structure.amount;
        case "due_day":
          return structure.due_day ?? 0;
        default:
          return categoryNameById.get(structure.fee_category_id) ?? "";
      }
    },
    [sortColumn, categoryNameById, yearNameById, levelNameById, gradeNameById, majorNameById]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return structures;
    return structures.filter((structure) =>
      [
        categoryNameById.get(structure.fee_category_id) ?? "",
        yearNameById.get(structure.academic_year_id) ?? "",
        levelNameById.get(structure.education_level_id) ?? "",
        gradeNameById.get(structure.grade_id) ?? "",
        structure.major_id ? majorNameById.get(structure.major_id) ?? "" : "",
        formatRupiah(structure.amount),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [structures, query, categoryNameById, yearNameById, levelNameById, gradeNameById, majorNameById]);

  const sorted = useMemo(() => {
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = getValue(a);
      const right = getValue(b);
      if (typeof left === "number" && typeof right === "number") return (left - right) * dir;
      return String(left).localeCompare(String(right), "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, getValue, sortDirection]);

  const visibleColumnList = STRUCTURE_COLUMNS.filter((col) => visibleColumns.has(col.key));
  const { safePage, safeTotalPages, rangeStart, rangeEnd, pageRows } = usePagination(sorted, page, pageSize);

  return (
    <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-heading text-[#21483b]">Skema Tarif</CardTitle>
          <CardDescription className="text-[#8b9f95]">
            {sorted.length} dari {structures.length} skema tarif
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <SearchField
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            isFocused={isSearchFocused}
            onFocusChange={setIsSearchFocused}
            placeholder="Cari skema tarif..."
            scope={STRUCTURE_COLUMNS.map((col) => col.label)}
          />
          <ColumnsToggle
            columns={STRUCTURE_COLUMNS}
            visibleColumns={visibleColumns}
            onToggle={(key) =>
              setVisibleColumns((prev) => {
                const next = new Set(prev);
                if (next.has(key)) {
                  if (next.size === 1) return prev;
                  next.delete(key);
                } else {
                  next.add(key);
                }
                return next;
              })
            }
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                {visibleColumnList.map((col) => (
                  <SortableHead
                    key={col.key}
                    label={col.label}
                    isSorted={sortColumn === col.key}
                    sortDirection={sortDirection}
                    onSort={() => {
                      if (sortColumn === col.key) {
                        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
                      } else {
                        setSortColumn(col.key);
                        setSortDirection("asc");
                      }
                    }}
                    className={
                      col.key === "fee_category_id"
                        ? `${SORTABLE_HEAD_CLASS} ${STICKY_FIRST_HEAD_CLASS}`
                        : SORTABLE_HEAD_CLASS
                    }
                  />
                ))}
                <TableHead className={`${SORTABLE_HEAD_CLASS} ${STICKY_ACTION_HEAD_CLASS}`}>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnList.length + 1}
                    className="h-32 border-b border-[#f0f5f1] px-3.5 py-3 text-center text-xs text-[#a0afa8]"
                  >
                    {query ? (
                      <p className="text-sm text-[#a0afa8]">
                        Tidak ada skema tarif yang cocok dengan pencarian.
                      </p>
                    ) : (
                      <div className="py-6">
                        <ListIcon className="mx-auto size-10 text-[#c3d3cb]" />
                        <p className="mt-2 text-sm font-medium text-[#3e5c50]">Belum ada skema tarif</p>
                        <p className="text-sm text-[#a0afa8]">
                          {canManage
                            ? "Tambahkan skema tarif biaya pertama untuk mulai."
                            : "Hubungi admin sekolah untuk menambahkan data."}
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((structure) => (
                  <TableRow
                    key={structure.id}
                    className="group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
                    onClick={() => onView(structure)}
                  >
                    {visibleColumnList.map((col) => (
                      <StructureCell
                        key={col.key}
                        columnKey={col.key}
                        structure={structure}
                        categoryNameById={categoryNameById}
                        yearNameById={yearNameById}
                        levelNameById={levelNameById}
                        gradeNameById={gradeNameById}
                        majorNameById={majorNameById}
                      />
                    ))}
                    <TableCell className={STICKY_ACTION_CELL_CLASS}>
                      {canManage ? (
                        <RowActions
                          onEdit={() => onEdit(structure)}
                          onDelete={() => onDelete(structure)}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            total={sorted.length}
            unit="skema tarif"
            safePage={safePage}
            safeTotalPages={safeTotalPages}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            pageSize={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onPageChange={setPage}
            inputId="skema-tarif-page-size"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StructureCell({
  columnKey,
  structure,
  categoryNameById,
  yearNameById,
  levelNameById,
  gradeNameById,
  majorNameById,
}: {
  columnKey: StructureColumnKey;
  structure: FeeStructure;
  categoryNameById: Map<string, string>;
  yearNameById: Map<string, string>;
  levelNameById: Map<string, string>;
  gradeNameById: Map<string, string>;
  majorNameById: Map<string, string>;
}) {
  const cellClass = "px-3.5 py-3 align-middle";

  if (columnKey === "fee_category_id") {
    const categoryName = categoryNameById.get(structure.fee_category_id) ?? "-";
    return (
      <TableCell className={STICKY_FIRST_CELL_CLASS}>
        <span className="block truncate text-[12px] font-semibold text-[#2b493e]" title={categoryName}>
          {categoryName}
        </span>
      </TableCell>
    );
  }

  if (columnKey === "academic_year_id") {
    const yearName = yearNameById.get(structure.academic_year_id) ?? "-";
    return (
      <TableCell className={cellClass}>
        <span className="block truncate text-xs text-[#3e5c50]" title={yearName}>
          {yearName}
        </span>
      </TableCell>
    );
  }

  if (columnKey === "education_level_id") {
    const levelName = levelNameById.get(structure.education_level_id) ?? "-";
    return (
      <TableCell className={cellClass}>
        <span className="block truncate text-xs text-[#3e5c50]" title={levelName}>
          {levelName}
        </span>
      </TableCell>
    );
  }

  if (columnKey === "grade_id") {
    const gradeName = gradeNameById.get(structure.grade_id) ?? "-";
    return (
      <TableCell className={cellClass}>
        <span className="block truncate text-xs text-[#3e5c50]" title={gradeName}>
          {gradeName}
        </span>
      </TableCell>
    );
  }

  if (columnKey === "major_id") {
    const majorName = structure.major_id ? majorNameById.get(structure.major_id) ?? "-" : "-";
    return (
      <TableCell className={cellClass}>
        <span className="block truncate text-xs text-[#3e5c50]" title={majorName}>
          {majorName}
        </span>
      </TableCell>
    );
  }

  if (columnKey === "amount") {
    return (
      <TableCell className={cellClass}>
        <span className="block truncate text-xs font-semibold text-[#2b493e]">
          {formatRupiah(structure.amount)}
        </span>
      </TableCell>
    );
  }

  return (
    <TableCell className={cellClass}>
      <span className="block truncate text-xs text-[#3e5c50]">
        {structure.due_day ? `Tanggal ${structure.due_day}` : "-"}
      </span>
    </TableCell>
  );
}

function SortableHead({
  label,
  isSorted,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  isSorted: boolean;
  sortDirection: "asc" | "desc";
  onSort: () => void;
  className: string;
}) {
  return (
    <TableHead onClick={onSort} className={className}>
      <div className="flex items-center gap-1.5">
        <span className={isSorted ? "text-[#2b7254]" : ""}>{label}</span>
        {isSorted ? (
          sortDirection === "asc" ? (
            <ArrowUpIcon className="size-3.5 shrink-0 text-[#2b7254]" />
          ) : (
            <ArrowDownIcon className="size-3.5 shrink-0 text-[#2b7254]" />
          )
        ) : (
          <ArrowUpDownIcon className="size-3.5 shrink-0 text-[#9aaa9f]" />
        )}
      </div>
    </TableHead>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Ubah"
        className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
      >
        <PencilIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Hapus"
        className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </div>
  );
}

function SearchField({
  value,
  onChange,
  isFocused,
  onFocusChange,
  placeholder,
  scope,
}: {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocusChange: (focused: boolean) => void;
  placeholder: string;
  scope: string[];
}) {
  return (
    <div className="relative w-full sm:w-64">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        placeholder={placeholder}
        className={SEARCH_INPUT_CLASS}
      />
      {isFocused ? (
        <div className={SEARCH_SCOPE_CLASS}>
          <p className={SEARCH_SCOPE_TITLE_CLASS}>Pencarian mencakup</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {scope.map((label) => (
              <span key={label} className={SEARCH_SCOPE_CHIP_CLASS}>
                {label}
              </span>
            ))}
          </div>
          <p className={SEARCH_SCOPE_HINT_CLASS}>
            Ketik satu kata — kolom di atas dicek. Gunakan tombol Kolom untuk menyembunyikan atau menampilkan
            kolom tabel.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ColumnsToggle<TColumnKey extends string>({
  columns,
  visibleColumns,
  onToggle,
}: {
  columns: { key: TColumnKey; label: string }[];
  visibleColumns: Set<TColumnKey>;
  onToggle: (key: TColumnKey) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={COLUMNS_TRIGGER_CLASS}>
        <Columns3Icon className="size-4 text-[#4d8669]" />
        <span className="text-[#537467]">Kolom</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 border-[#e2ece5] bg-white text-[#5d7a6e]">
        {columns.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visibleColumns.has(col.key)}
            onCheckedChange={() => onToggle(col.key)}
            className="text-xs text-[#5d7a6e] focus:bg-[#f4faf5]"
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pagination({
  total,
  unit,
  safePage,
  safeTotalPages,
  rangeStart,
  rangeEnd,
  pageSize,
  onPageSizeChange,
  onPageChange,
  inputId,
}: {
  total: number;
  unit: string;
  safePage: number;
  safeTotalPages: number;
  rangeStart: number;
  rangeEnd: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onPageChange: (page: number) => void;
  inputId: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#8b9f95]">
          Menampilkan {rangeStart}–{rangeEnd} dari {total} {unit}
        </span>
        <div className="flex items-center gap-1.5">
          <label htmlFor={inputId} className="text-[10px] font-bold text-[#6c8279]">
            Baris
          </label>
          <select
            id={inputId}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs font-normal text-[#284a3d] outline-none focus:border-[#9dc7a8]"
          >
            {[5, 10, 20, 30].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
      <TablePaginationControls page={safePage} totalPages={safeTotalPages} onPageChange={onPageChange} />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[.04em] text-[#8b9f95] uppercase">{label}</dt>
      <dd
        className="mt-1 truncate text-xs text-[#2b493e]"
        title={typeof value === "string" ? value : undefined}
      >
        {value || "-"}
      </dd>
    </div>
  );
}

function CategoryDetailDialog({
  category,
  onClose,
}: {
  category: FeeCategory | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(category)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)] ring-1 ring-[#dbe8df] sm:max-w-[600px] rounded-[17px]">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
            Keuangan
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail Kategori Biaya
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan informasi kategori biaya.
          </DialogDescription>
        </DialogHeader>
        {category ? (
          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#2b493e]" title={category.name}>
                {category.name}
              </p>
            </div>
            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
              Informasi Kategori
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow label="Nama Kategori" value={category.name} />
              <DetailRow label="Frekuensi Tagih" value={BILLING_CYCLE_LABELS[category.billing_cycle]} />
              <DetailRow label="Deskripsi" value={category.description ?? "-"} />
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function StructureDetailDialog({
  structure,
  onClose,
  categoryName,
  yearName,
  levelName,
  gradeName,
  majorName,
}: {
  structure: FeeStructure | null;
  onClose: () => void;
  categoryName?: string;
  yearName?: string;
  levelName?: string;
  gradeName?: string;
  majorName?: string;
}) {
  return (
    <Dialog open={Boolean(structure)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)] ring-1 ring-[#dbe8df] sm:max-w-[640px] rounded-[17px]">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
            Keuangan
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail Skema Tarif
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan tarif biaya yang berlaku untuk tahun ajaran terpilih.
          </DialogDescription>
        </DialogHeader>
        {structure ? (
          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="flex items-center gap-3 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] px-4 py-3">
              <ReceiptIcon className="size-8 shrink-0 text-[#4c9a77]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#2b493e]" title={categoryName}>
                  {categoryName ?? "-"}
                </p>
                <p className="text-[11px] text-[#5d7a6e]">
                  {yearName ?? "-"} · {gradeName ?? "-"}
                </p>
              </div>
              <span className="ml-auto shrink-0 text-sm font-bold text-[#185743]">
                {formatRupiah(structure.amount)}
              </span>
            </div>
            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
              Informasi Tarif
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow label="Kategori Biaya" value={categoryName ?? "-"} />
              <DetailRow label="Tahun Ajaran" value={yearName ?? "-"} />
              <DetailRow label="Jenjang" value={levelName ?? "-"} />
              <DetailRow label="Tingkat" value={gradeName ?? "-"} />
              <DetailRow label="Jurusan" value={majorName ?? "-"} />
              <DetailRow
                label="Jatuh Tempo"
                value={structure.due_day ? `Tanggal ${structure.due_day}` : "-"}
              />
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FeeCategory | null;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveFeeCategory,
    undefined
  );

  useEffect(() => {
    if (state?.success) onSaved(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)] ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px]">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
              Keuangan
            </span>
            <DialogTitle
              className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {isEdit ? "Ubah Kategori" : "Tambah Kategori"}
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              Definisikan jenis biaya yang tersedia beserta frekuensi tagihnya.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div
            className="flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="name" required>
                Nama Kategori
              </FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="Contoh: SPP"
                className={FORM_INPUT_CLASS}
                required
              />
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="billing_cycle" required>
                Frekuensi Tagih
              </FieldLabel>
              <select
                id="billing_cycle"
                name="billing_cycle"
                defaultValue={editing?.billing_cycle ?? "bulanan"}
                className={FORM_SELECT_CLASS}
                required
              >
                {Object.entries(BILLING_CYCLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="description" optional>
                Deskripsi
              </FieldLabel>
              <Input
                id="description"
                name="description"
                defaultValue={editing?.description ?? ""}
                placeholder="Keterangan singkat kategori biaya"
                className={FORM_INPUT_CLASS}
              />
            </div>
          </div>

          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 pt-[15px] pb-7">
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]"
              >
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Kategori"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StructureFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  academicYears,
  educationLevels,
  grades,
  majors,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FeeStructure | null;
  categories: FeeCategory[];
  academicYears: AcademicYear[];
  educationLevels: EducationLevel[];
  grades: Grade[];
  majors: Major[];
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveFeeStructure,
    undefined
  );
  const [levelId, setLevelId] = useState(editing?.education_level_id ?? "");
  const [gradeId, setGradeId] = useState(editing?.grade_id ?? "");
  const [majorId, setMajorId] = useState(editing?.major_id ?? "");

  const levelGrades = useMemo(
    () => (levelId ? grades.filter((grade) => grade.education_level_id === levelId) : []),
    [grades, levelId]
  );
  const levelMajors = useMemo(
    () => (levelId ? majors.filter((major) => major.education_level_id === levelId) : []),
    [majors, levelId]
  );

  useEffect(() => {
    if (state?.success) onSaved(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)] ring-1 ring-[#dbe8df] sm:max-w-[720px] rounded-[17px]">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
              Keuangan
            </span>
            <DialogTitle
              className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {isEdit ? "Ubah Skema Tarif" : "Tambah Skema Tarif"}
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              Atur tarif berdasarkan tahun ajaran, jenjang, tingkat, dan jurusan.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="fee_category_id" required>
                  Kategori Biaya
                </FieldLabel>
                <select
                  id="fee_category_id"
                  name="fee_category_id"
                  defaultValue={editing?.fee_category_id ?? ""}
                  className={FORM_SELECT_CLASS}
                  required
                >
                  <option value="">- pilih kategori -</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="academic_year_id" required>
                  Tahun Ajaran
                </FieldLabel>
                <select
                  id="academic_year_id"
                  name="academic_year_id"
                  defaultValue={editing?.academic_year_id ?? ""}
                  className={FORM_SELECT_CLASS}
                  required
                >
                  <option value="">- pilih tahun ajaran -</option>
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="education_level_id" required>
                  Jenjang
                </FieldLabel>
                <select
                  id="education_level_id"
                  name="education_level_id"
                  value={levelId}
                  onChange={(event) => {
                    setLevelId(event.target.value);
                    setGradeId("");
                    setMajorId("");
                  }}
                  className={FORM_SELECT_CLASS}
                  required
                >
                  <option value="">- pilih jenjang -</option>
                  {educationLevels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="grade_id" required>
                  Tingkat
                </FieldLabel>
                <select
                  id="grade_id"
                  name="grade_id"
                  value={gradeId}
                  onChange={(event) => setGradeId(event.target.value)}
                  className={FORM_SELECT_CLASS}
                  disabled={!levelId}
                  required
                >
                  <option value="">{levelId ? "- pilih tingkat -" : "- pilih jenjang dahulu -"}</option>
                  {levelGrades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="major_id" optional>
                  Jurusan
                </FieldLabel>
                <select
                  id="major_id"
                  name="major_id"
                  value={majorId}
                  onChange={(event) => setMajorId(event.target.value)}
                  className={FORM_SELECT_CLASS}
                  disabled={!levelId}
                >
                  <option value="">- tidak ada -</option>
                  {levelMajors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="due_day" optional>
                  Hari Jatuh Tempo
                </FieldLabel>
                <Input
                  id="due_day"
                  name="due_day"
                  type="number"
                  min={1}
                  max={28}
                  defaultValue={editing?.due_day?.toString() ?? ""}
                  placeholder="1-28"
                  className={FORM_INPUT_CLASS}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <FieldLabel htmlFor="amount" required>
                  Nominal
                </FieldLabel>
                <Input
                  id="amount"
                  name="amount"
                  defaultValue={editing ? String(editing.amount) : ""}
                  placeholder="Contoh: 500000"
                  inputMode="numeric"
                  className={FORM_INPUT_CLASS}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 pt-[15px] pb-7">
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : isEdit
                    ? "Simpan Perubahan"
                    : "Tambah Skema Tarif"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function usePagination<TItem>(items: TItem[], page: number, pageSize: number) {
  const total = items.length;
  const safeTotalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, safeTotalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);
  const pageRows = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { safePage, safeTotalPages, rangeStart, rangeEnd, pageRows };
}
