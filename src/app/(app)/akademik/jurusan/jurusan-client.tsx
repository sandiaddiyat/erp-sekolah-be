"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  FilterIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
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
import type { EducationLevel, Major } from "@/lib/types";
import { saveMajor, deleteMajor } from "../actions";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type FormState = { error?: string; success?: string } | undefined;

type ColumnKey = "name" | "jenjang";

const allColumns: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Nama Jurusan" },
  { key: "jenjang", label: "Jenjang" },
];

const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

export function JurusanClient({
  majors,
  levels,
  canManage,
}: {
  majors: Major[];
  levels: EducationLevel[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Major | null>(null);
  const [viewing, setViewing] = useState<Major | null>(null);
  const [deleting, setDeleting] = useState<Major | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(allColumns.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<ColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterLevel, setFilterLevel] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const levelById = useMemo(
    () => new Map(levels.map((l) => [l.id, l.name])),
    [levels]
  );

  const levelName = useMemo(
    () => (id: string): string => levelById.get(id) ?? "-",
    [levelById]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return majors.filter((m) => {
      if (filterLevel && m.education_level_id !== filterLevel) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        levelName(m.education_level_id).toLowerCase().includes(q)
      );
    });
  }, [majors, query, filterLevel, levelName]);

  const sorted = useMemo(() => {
    const getVal = (item: Major): string =>
      sortColumn === "name" ? item.name : levelName(item.education_level_id);
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      return getVal(a).localeCompare(getVal(b), "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sortColumn, sortDirection, levelName]);

  const safeTotalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, safeTotalPages);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sorted.length);
  const paginatedRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const visibleColumnList = allColumns.filter((col) => visibleColumns.has(col.key));
  const hasActiveFilters = Boolean(filterLevel);

  const handleSort = (key: ColumnKey) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev;
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const openCreate = () => {
    setBanner(null);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Major) => {
    setBanner(null);
    setEditing(item);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteMajor(undefined, formData);
      if (result?.error) toast.error(result.error);
      else if (result?.success) setBanner(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]">Akademik</span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">Jurusan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola jurusan khusus SMA/SMK, terkait dengan jenjang pendidikan.
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={openCreate}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <PlusIcon data-icon="inline-start" className="size-4" />
            Tambah Jurusan
          </Button>
        ) : null}
      </div>

      {banner ? (
        <div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">
          {banner}
        </div>
      ) : null}

      <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-[#21483b]">Daftar Jurusan</CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {sorted.length} dari {majors.length} jurusan
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Cari data jurusan..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
              {isSearchFocused ? (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                  <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                    Pencarian mencakup
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                      Nama Jurusan
                    </span>
                    <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                      Jenjang
                    </span>
                  </div>
                  <p className="mt-2.5 text-[10px] leading-relaxed text-[#8b9f95]">
                    Ketik satu kata — kolom di atas dicek. Gunakan Filter untuk menyaring
                    per kolom.
                  </p>
                </div>
              ) : null}
            </div>
            {canManage ? (
              <Button
                variant="outline"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className={
                  isFilterOpen || hasActiveFilters
                    ? "relative h-8 gap-1.5 shrink-0 rounded-[8px] border-[#185743] bg-[#185743] px-3 text-[10px] font-bold text-white hover:bg-[#124636]"
                    : "relative h-8 gap-1.5 shrink-0 rounded-[8px] border-[#e2ece5] bg-white px-3 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                }
              >
                <FilterIcon className="size-3.5" />
                Filter
                {hasActiveFilters ? (
                  <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#d06a5d] text-[9px] font-bold text-white">
                    1
                  </span>
                ) : null}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 shrink-0 border-[#e2ece5] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                  />
                }
              >
                <Columns3Icon className="size-4 text-[#4d8669]" />
                <span className="text-[#537467]">Kolom</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-[#e2ece5] bg-white text-[#5d7a6e]">
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    className="text-xs text-[#5d7a6e] focus:bg-[#f4faf5]"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        {canManage && isFilterOpen ? (
          <div className="mx-6 mb-5 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-[14px] font-semibold tracking-[-.03em] text-[#24483b]">
                  Filter Data Jurusan
                </p>
                <p className="mt-0.5 text-[10px] text-[#93a49c]">
                  Kombinasikan beberapa filter untuk mempersempit hasil.
                </p>
              </div>
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterLevel("");
                    setPage(1);
                  }}
                  className="h-7 gap-1.5 rounded-[8px] px-2.5 text-[10px] font-bold text-[#ad685d] hover:bg-[#fdf0ee] hover:text-[#ad685d]"
                >
                  <XIcon className="size-3.5" />
                  Hapus semua filter
                </Button>
              ) : null}
            </div>
            <div className="mt-4">
              <label className="text-[10px] font-bold text-[#4c6a5e]">Jenjang</label>
              <select
                value={filterLevel}
                onChange={(event) => {
                  setFilterLevel(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
              >
                <option value="">Semua</option>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        <CardContent className="px-0">
          <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                  {visibleColumnList.map((col, index) => {
                    const isSorted = sortColumn === col.key;
                    return (
                      <TableHead
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254] ${index === 0 ? "pl-6" : ""} ${col.key === "name" ? "sticky left-0 z-20 bg-white shadow-[8px_0_8px_-8px_#1c44331a]" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={isSorted ? "text-[#2b7254]" : ""}>{col.label}</span>
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
                  })}
                  <TableHead className="sticky right-0 z-20 w-10 justify-end bg-white pr-6 text-right text-[10px] font-bold text-[#6c8279] shadow-[-8px_0_8px_-8px_#1c44331a]">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumnList.length + 1}
                      className="h-32 border-b border-[#f0f5f1] px-3.5 py-3 text-center text-xs text-[#a0afa8]"
                    >
                      {query || hasActiveFilters ? (
                        <p className="text-sm text-[#a0afa8]">
                          Tidak ada jurusan yang cocok dengan pencarian atau filter.
                        </p>
                      ) : (
                        <div className="py-6">
                          <p className="text-sm font-medium text-[#3e5c50]">Belum ada jurusan</p>
                          <p className="text-sm text-[#a0afa8]">
                            {canManage
                              ? "Tambahkan jurusan pertama untuk mulai."
                              : "Hubungi admin sekolah untuk menambahkan data."}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((item) => (
                    <TableRow
                      key={item.id}
                      className="group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
                      onClick={() => setViewing(item)}
                    >
                      {visibleColumnList.map((col) => {
                        if (col.key === "name") {
                          return (
                            <TableCell
                              key={col.key}
                              className="sticky left-0 z-10 bg-white px-3.5 py-3 pl-6 align-middle shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]"
                            >
                              <span
                                className="block truncate text-[12px] font-semibold text-[#2b493e]"
                                title={item.name}
                              >
                                {item.name}
                              </span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell
                            key={col.key}
                            className="px-3.5 py-3 text-xs whitespace-nowrap text-[#3e5c50] align-middle"
                          >
                            {levelName(item.education_level_id)}
                          </TableCell>
                        );
                      })}
                      <TableCell className="sticky right-0 z-10 bg-white px-3 py-3 pr-6 align-middle shadow-[-8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Ubah"
                              className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(item);
                              }}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Hapus"
                              className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleting(item);
                              }}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8b9f95]">
                  Menampilkan {rangeStart}–{rangeEnd} dari {sorted.length} jurusan
                </span>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="jurusan-page-size" className="text-[10px] font-bold text-[#6c8279]">
                    Baris
                  </label>
                  <select
                    id="jurusan-page-size"
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded-[9px] border border-[#e2ece5] bg-white px-2 text-xs text-[#284a3d] outline-none focus:border-[#9dc7a8]"
                  >
                    {[5, 10, 20, 30].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                >
                  Sebelumnya
                </Button>
                <span className="px-1.5 text-xs font-semibold text-[#537467]">
                  {safePage} / {safeTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= safeTotalPages}
                  onClick={() => setPage(safePage + 1)}
                  className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailDialog jurusan={viewing} levelName={levelName} onClose={() => setViewing(null)} />

      {canManage ? (
        <>
          <FormDialog
            key={editing?.id ?? "new"}
            open={formOpen}
            onOpenChange={setFormOpen}
            editing={editing}
            levels={levels}
            onSaved={(message) => {
              setBanner(message);
              setFormOpen(false);
            }}
          />

          <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus jurusan ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleting ? `${deleting.name} akan dihapus permanen.` : ""}
                  Jurusan yang masih dipakai kelas tidak bisa dihapus.
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
        </>
      ) : null}
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

function DetailDialog({
  jurusan,
  levelName,
  onClose,
}: {
  jurusan: Major | null;
  levelName: (id: string) => string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(jurusan)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[600px] rounded-[17px] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)]">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
            Data akademik
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail Jurusan
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan informasi jurusan.
          </DialogDescription>
        </DialogHeader>
        {jurusan ? (
          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#2b493e]" title={jurusan.name}>
                {jurusan.name}
              </p>
            </div>
            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Jurusan</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow label="Nama Jurusan" value={jurusan.name} />
              <DetailRow label="Jenjang" value={levelName(jurusan.education_level_id)} />
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormDialog({
  open,
  onOpenChange,
  editing,
  levels,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Major | null;
  levels: EducationLevel[];
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveMajor, undefined);

  useEffect(() => {
    if (state?.success) onSaved(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
              Data akademik
            </span>
            <DialogTitle
              className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {isEdit ? "Ubah Jurusan" : "Tambah Jurusan"}
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              Lengkapi informasi jurusan untuk menyimpan data.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div
            className="flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="education_level_id" required>
                Jenjang
              </FieldLabel>
              <select
                id="education_level_id"
                name="education_level_id"
                defaultValue={editing?.education_level_id ?? ""}
                className={SELECT_CLASS}
                required
              >
                <option value="">- pilih jenjang -</option>
                {levels.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="name" required>
                Nama Jurusan
              </FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="Contoh: IPA / IPS / TKJ"
                required={!isEdit}
              />
            </div>
          </div>

          <DialogFooter className="rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[24px]">
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
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Jurusan"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
