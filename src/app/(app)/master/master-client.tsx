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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { FormState } from "@/lib/types";
import {
  MASTER_ENTITIES,
  MASTER_LABELS,
  type MasterEntity,
} from "@/features/master/schema";
import { deleteMaster, saveMaster } from "./actions";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type MasterRow = Record<string, unknown>;

type FieldType = "text" | "select" | "date" | "checkbox";

type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
};

type ColumnConfig = { key: string; label: string };

type EntityConfig = {
  nameColumn: string;
  tableColumns: ColumnConfig[];
  filterKey?: string;
  filterLabel?: string;
  filterOptions?: { value: string; label: string }[];
  fields: FieldConfig[];
};

const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

const CATEGORY_OPTIONS = [
  { value: "fungsional", label: "Fungsional" },
  { value: "struktural", label: "Struktural" },
];

const SEMESTER_OPTIONS = [
  { value: "ganjil", label: "Ganjil" },
  { value: "genap", label: "Genap" },
];

const ENTITY_CONFIG: Record<MasterEntity, EntityConfig> = {
  status_kepegawaian: {
    nameColumn: "nama_status",
    tableColumns: [{ key: "nama_status", label: "Nama Status" }],
    fields: [{ name: "nama_status", label: "Nama Status", type: "text", required: true }],
  },
  jabatan: {
    nameColumn: "nama_jabatan",
    tableColumns: [
      { key: "nama_jabatan", label: "Nama Jabatan" },
      { key: "kategori", label: "Kategori" },
    ],
    filterKey: "kategori",
    filterLabel: "Kategori",
    filterOptions: CATEGORY_OPTIONS,
    fields: [
      { name: "nama_jabatan", label: "Nama Jabatan", type: "text", required: true },
      { name: "kategori", label: "Kategori", type: "select", options: CATEGORY_OPTIONS },
    ],
  },
  golongan: {
    nameColumn: "kode_golongan",
    tableColumns: [
      { key: "kode_golongan", label: "Kode Golongan" },
      { key: "keterangan", label: "Keterangan" },
    ],
    fields: [
      { name: "kode_golongan", label: "Kode Golongan", type: "text", required: true, placeholder: "III/a" },
      { name: "keterangan", label: "Keterangan", type: "text" },
    ],
  },
  unit_kerja: {
    nameColumn: "nama_unit",
    tableColumns: [
      { key: "nama_unit", label: "Nama Unit" },
      { key: "parent_unit_id", label: "Unit Induk" },
    ],
    fields: [
      { name: "nama_unit", label: "Nama Unit", type: "text", required: true },
      { name: "parent_unit_id", label: "Unit Induk", type: "select" },
    ],
  },
  mapel: {
    nameColumn: "nama_mapel",
    tableColumns: [
      { key: "nama_mapel", label: "Nama Mata Pelajaran" },
      { key: "kode_mapel", label: "Kode" },
    ],
    fields: [
      { name: "nama_mapel", label: "Nama Mata Pelajaran", type: "text", required: true },
      { name: "kode_mapel", label: "Kode Mapel", type: "text", required: true, placeholder: "MAT" },
    ],
  },
  jurusan: {
    nameColumn: "nama_jurusan",
    tableColumns: [{ key: "nama_jurusan", label: "Nama Jurusan" }],
    fields: [{ name: "nama_jurusan", label: "Nama Jurusan", type: "text", required: true }],
  },
  jenis_sertifikasi: {
    nameColumn: "nama_sertifikasi",
    tableColumns: [{ key: "nama_sertifikasi", label: "Nama Sertifikasi" }],
    fields: [{ name: "nama_sertifikasi", label: "Nama Sertifikasi", type: "text", required: true }],
  },
  jenis_cuti_izin: {
    nameColumn: "nama_jenis",
    tableColumns: [
      { key: "nama_jenis", label: "Nama Jenis" },
      { key: "kuota_hari", label: "Kuota Hari" },
    ],
    filterKey: "kuota_hari",
    filterLabel: "Kuota Hari",
    filterOptions: [
      { value: "ada", label: "Punya kuota" },
      { value: "tidak", label: "Tanpa kuota" },
    ],
    fields: [
      { name: "nama_jenis", label: "Nama Jenis", type: "text", required: true },
      { name: "kuota_hari", label: "Kuota Hari (opsional)", type: "text", placeholder: "12" },
    ],
  },
  tahun_ajaran: {
    nameColumn: "nama_tahun_ajaran",
    tableColumns: [
      { key: "nama_tahun_ajaran", label: "Tahun Ajaran" },
      { key: "semester", label: "Semester" },
      { key: "tanggal_mulai", label: "Tanggal Mulai" },
      { key: "tanggal_selesai", label: "Tanggal Selesai" },
      { key: "status_aktif", label: "Status Aktif" },
    ],
    filterKey: "semester",
    filterLabel: "Semester",
    filterOptions: SEMESTER_OPTIONS,
    fields: [
      { name: "nama_tahun_ajaran", label: "Tahun Ajaran", type: "text", required: true, placeholder: "2025/2026" },
      { name: "semester", label: "Semester", type: "select", options: SEMESTER_OPTIONS },
      { name: "tanggal_mulai", label: "Tanggal Mulai", type: "date" },
      { name: "tanggal_selesai", label: "Tanggal Selesai", type: "date" },
      { name: "status_aktif", label: "Status Aktif", type: "checkbox" },
    ],
  },
};

function formatCell(entity: MasterEntity, key: string, row: MasterRow, allRows: Record<string, MasterRow[]>): string {
  const value = row[key];
  if (key === "parent_unit_id") {
    if (!value) return "-";
    const parent = (allRows.unit_kerja ?? []).find((u) => String(u.id) === String(value));
    return parent ? String(parent.nama_unit ?? "-") : "-";
  }
  if (key === "kuota_hari") {
    return value == null || value === "" ? "-" : String(value);
  }
  if (typeof value === "boolean") {
    return value ? "Ya" : "-";
  }
  if (value == null || value === "") return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return String(value);
}

export function MasterClient({
  data,
  canManage,
}: {
  data: Record<string, MasterRow[]>;
  canManage: boolean;
}) {
  const [entity, setEntity] = useState<MasterEntity>("status_kepegawaian");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [viewing, setViewing] = useState<MasterRow | null>(null);
  const [deleting, setDeleting] = useState<MasterRow | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set(ENTITY_CONFIG.status_kepegawaian.tableColumns.map((c) => c.key))
  );
  const [sortColumn, setSortColumn] = useState<string>("nama_status");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const config = ENTITY_CONFIG[entity];
  const rows = useMemo(() => data[entity] ?? [], [data, entity]);

  const switchEntity = (next: MasterEntity) => {
    setEntity(next);
    setQuery("");
    setFilterValue("");
    setIsFilterOpen(false);
    setVisibleColumns(new Set(ENTITY_CONFIG[next].tableColumns.map((c) => c.key)));
    setSortColumn(ENTITY_CONFIG[next].nameColumn);
    setSortDirection("asc");
    setPage(1);
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (config.filterKey && filterValue) {
        const raw = row[config.filterKey];
        if (config.filterKey === "kuota_hari") {
          const hasQuota = raw != null && raw !== "";
          if (filterValue === "ada" && !hasQuota) return false;
          if (filterValue === "tidak" && hasQuota) return false;
        } else if (String(raw ?? "") !== filterValue) {
          return false;
        }
      }
      if (!needle) return true;
      return config.tableColumns
        .map((col) => formatCell(entity, col.key, row, data))
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, filterValue, config, entity, data]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const valA = formatCell(entity, sortColumn, a, data);
      const valB = formatCell(entity, sortColumn, b, data);
      return sortDirection === "asc"
        ? valA.localeCompare(valB, "id", { numeric: true, sensitivity: "base" })
        : valB.localeCompare(valA, "id", { numeric: true, sensitivity: "base" });
    });
  }, [filtered, sortColumn, sortDirection, entity, data]);

  const safeTotalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, safeTotalPages);
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, sorted.length);
  const paginatedRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const visibleColumnList = config.tableColumns.filter((col) => visibleColumns.has(col.key));
  const hasActiveFilters = Boolean(config.filterKey && filterValue);

  const handleSort = (key: string) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const toggleColumn = (key: string) => {
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

  const openEdit = (row: MasterRow) => {
    setBanner(null);
    setEditing(row);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteMaster(entity, String(target.id));
      if (result?.error) toast.error(result.error);
      else if (result?.success) setBanner(result.success);
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]">Master data</span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">Master Data</h1>
          <p className="text-sm text-muted-foreground">
            Data referensi yang dipakai oleh modul lain (pegawai, kelas, dll).
          </p>
        </div>
        {canManage ? (
          <Button
            onClick={openCreate}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <PlusIcon data-icon="inline-start" className="size-4" />
            Tambah {MASTER_LABELS[entity]}
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
          <div className="flex items-center gap-3">
            <select
              value={entity}
              onChange={(event) => switchEntity(event.target.value as MasterEntity)}
              aria-label="Pilih jenis data master"
              className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] font-semibold text-[#36584a] outline-none focus:border-[#78ad8a]"
            >
              {MASTER_ENTITIES.map((item) => (
                <option key={item} value={item}>
                  {MASTER_LABELS[item]}
                </option>
              ))}
            </select>
            <div>
              <CardTitle className="font-heading text-[#21483b]">Daftar {MASTER_LABELS[entity]}</CardTitle>
              <CardDescription className="text-[#8b9f95]">
                {sorted.length} dari {rows.length} data
              </CardDescription>
            </div>
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
                placeholder={`Cari data ${MASTER_LABELS[entity].toLowerCase()}...`}
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
              {isSearchFocused ? (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                  <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                    Pencarian mencakup
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {config.tableColumns.map((col) => (
                      <span
                        key={col.key}
                        className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]"
                      >
                        {col.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[10px] leading-relaxed text-[#8b9f95]">
                    Ketik satu kata — kolom di atas dicek. Gunakan Filter untuk menyaring
                    per kolom.
                  </p>
                </div>
              ) : null}
            </div>
            {canManage && config.filterKey ? (
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
                {config.tableColumns.map((col) => (
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
        {canManage && config.filterKey && isFilterOpen ? (
          <div className="mx-6 mb-5 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-[14px] font-semibold tracking-[-.03em] text-[#24483b]">
                  Filter Data {MASTER_LABELS[entity]}
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
                    setFilterValue("");
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
              <label className="text-[10px] font-bold text-[#4c6a5e]">{config.filterLabel}</label>
              <select
                value={filterValue}
                onChange={(event) => {
                  setFilterValue(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
              >
                <option value="">Semua</option>
                {(config.filterOptions ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
                        className={`px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254] ${index === 0 ? "pl-6" : ""} ${index === 0 ? "sticky left-0 z-20 bg-white shadow-[8px_0_8px_-8px_#1c44331a]" : ""}`}
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
                          Tidak ada {MASTER_LABELS[entity].toLowerCase()} yang cocok dengan pencarian atau filter.
                        </p>
                      ) : (
                        <div className="py-6">
                          <p className="text-sm font-medium text-[#3e5c50]">
                            Belum ada {MASTER_LABELS[entity].toLowerCase()}
                          </p>
                          <p className="text-sm text-[#a0afa8]">
                            {canManage
                              ? `Tambahkan ${MASTER_LABELS[entity].toLowerCase()} pertama untuk mulai.`
                              : "Hubungi admin sekolah untuk menambahkan data."}
                          </p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((row) => (
                    <TableRow
                      key={String(row.id)}
                      className="group cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
                      onClick={() => setViewing(row)}
                    >
                      {visibleColumnList.map((col) => {
                        const isNameCol = col.key === config.nameColumn;
                        const text = formatCell(entity, col.key, row, data);
                        return (
                          <TableCell
                            key={col.key}
                            className={`px-3.5 py-3 align-middle ${isNameCol ? "sticky left-0 z-10 bg-white pl-6 shadow-[8px_0_8px_-8px_#1c44331a] group-hover:bg-[#f6fbf7]" : ""}`}
                          >
                            {col.key === "status_aktif" ? (
                              row.status_aktif ? (
                                <Badge className="rounded-[99px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254] gap-[5px]">
                                  <span className="size-[5px] shrink-0 rounded-full bg-[#2b7254]" />
                                  Aktif
                                </Badge>
                              ) : (
                                <span className="text-xs text-[#9aaa9f]">-</span>
                              )
                            ) : (
                              <span
                                className={`block truncate text-xs ${isNameCol ? "max-w-[220px] font-semibold text-[#2b493e]" : "text-[#3e5c50]"}`}
                                title={text}
                              >
                                {text}
                              </span>
                            )}
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
                                openEdit(row);
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
                                setDeleting(row);
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
                  Menampilkan {rangeStart}–{rangeEnd} dari {sorted.length} data
                </span>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="master-page-size" className="text-[10px] font-bold text-[#6c8279]">
                    Baris
                  </label>
                  <select
                    id="master-page-size"
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

      <DetailDialog
        entity={entity}
        config={config}
        row={viewing}
        allRows={data}
        onClose={() => setViewing(null)}
      />

      {canManage ? (
        <>
          <MasterFormDialog
            key={editing?.id ? `${entity}-${editing.id}` : `new-${entity}`}
            open={formOpen}
            onOpenChange={setFormOpen}
            entity={entity}
            config={config}
            allRows={data}
            editing={editing}
            onSaved={(message) => {
              setBanner(message);
              setFormOpen(false);
            }}
          />

          <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleting
                    ? `${String(deleting[config.nameColumn] ?? "")} akan dihapus permanen. Data yang masih dipakai di modul lain tidak bisa dihapus.`
                    : ""}
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
  entity,
  config,
  row,
  allRows,
  onClose,
}: {
  entity: MasterEntity;
  config: EntityConfig;
  row: MasterRow | null;
  allRows: Record<string, MasterRow[]>;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[600px] rounded-[17px] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)]">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
            Data master
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail {MASTER_LABELS[entity]}
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan informasi data master.
          </DialogDescription>
        </DialogHeader>
        {row ? (
          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold text-[#2b493e]"
                title={String(row[config.nameColumn] ?? "")}
              >
                {String(row[config.nameColumn] ?? "-")}
              </p>
            </div>
            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">
              Informasi {MASTER_LABELS[entity]}
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              {config.tableColumns.map((col) => {
                if (col.key === "status_aktif") {
                  return (
                    <DetailRow
                      key={col.key}
                      label={col.label}
                      value={row.status_aktif ? "Aktif" : null}
                    />
                  );
                }
                return (
                  <DetailRow
                    key={col.key}
                    label={col.label}
                    value={formatCell(entity, col.key, row, allRows)}
                  />
                );
              })}
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MasterFormDialog({
  open,
  onOpenChange,
  entity,
  config,
  allRows,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: MasterEntity;
  config: EntityConfig;
  allRows: Record<string, MasterRow[]>;
  editing: MasterRow | null;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveMaster,
    undefined
  );

  useEffect(() => {
    if (state?.success) onSaved(state.success);
    else if (state?.error) toast.error(state.error);
  }, [state, onSaved]);

  const unitOptions = (allRows.unit_kerja ?? [])
    .filter((row) => row.id !== editing?.id)
    .map((row) => ({ value: String(row.id), label: String(row.nama_unit) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[560px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
              Data master
            </span>
            <DialogTitle
              className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {isEdit ? `Ubah ${MASTER_LABELS[entity]}` : `Tambah ${MASTER_LABELS[entity]}`}
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              Lengkapi informasi untuk menyimpan data. Data ini hanya berlaku untuk sekolah Anda.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={String(editing.id)} /> : null}
          <input type="hidden" name="entity" value={entity} />

          <div
            className="flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            {config.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                {field.type === "checkbox" ? (
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id={field.name}
                      name={field.name}
                      defaultChecked={Boolean(editing?.[field.name])}
                    />
                    <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
                  </div>
                ) : (
                  <>
                    <FieldLabel htmlFor={field.name} required={field.required}>
                      {field.label}
                    </FieldLabel>
                    {field.type === "select" ? (
                      <select
                        id={field.name}
                        name={field.name}
                        defaultValue={
                          editing?.[field.name] ? String(editing[field.name]) : ""
                        }
                        className={SELECT_CLASS}
                      >
                        <option value="">- tidak ada -</option>
                        {(field.name === "parent_unit_id" ? unitOptions : field.options ?? []).map(
                          (option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    ) : (
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type === "date" ? "date" : "text"}
                        defaultValue={
                          editing?.[field.name] ? String(editing[field.name]) : ""
                        }
                        placeholder={field.placeholder}
                        required={field.required && !isEdit}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
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
                {isSubmitting
                  ? "Menyimpan..."
                  : isEdit
                    ? "Simpan Perubahan"
                    : `Simpan ${MASTER_LABELS[entity]}`}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
