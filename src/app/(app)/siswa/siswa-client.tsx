"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  useActionState,
} from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  DownloadIcon,
  FilterIcon,
  ImagePlusIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  UserPlusIcon,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import type { FormState, Siswa } from "@/lib/types";
import { deleteSiswa, saveSiswa } from "./actions";
import { exportSiswa } from "./export-action";
import { importSiswa, type ImportSiswaResult } from "./import-action";
import type { SiswaOptionLists } from "./page";

type Permissions = { create: boolean; update: boolean; delete: boolean; export: boolean; import: boolean };

type ColumnKey =
  | "nis"
  | "nisn"
  | "name"
  | "gender"
  | "birth_place"
  | "birth_date"
  | "address"
  | "father"
  | "mother"
  | "guardian"
  | "phone"
  | "status"
  | "actions";

const allColumns: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Nama" },
  { key: "nis", label: "NIS" },
  { key: "nisn", label: "NISN" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "birth_place", label: "Tempat Lahir" },
  { key: "birth_date", label: "Tanggal Lahir" },
  { key: "address", label: "Alamat" },
  { key: "father", label: "Nama Ayah" },
  { key: "mother", label: "Nama Ibu" },
  { key: "guardian", label: "Nama Wali" },
  { key: "phone", label: "Telepon" },
  { key: "status", label: "Status" },
];

// Palet referensi: Template-ERP-Sekolah (blok "student management").
const STATUS_PILL: Record<Siswa["status"], string> = {
  aktif: "bg-[#e7f5e9] text-[#2b7254]",
  lulus: "bg-[#e8f2f5] text-[#3a7591]",
  pindah: "bg-[#fcf3e3] text-[#a67437]",
  keluar: "bg-[#fdf0ee] text-[#ad685d]",
};

const STATUS_LABEL: Record<Siswa["status"], string> = {
  aktif: "Aktif",
  lulus: "Lulus",
  pindah: "Pindah",
  keluar: "Keluar",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function SiswaClient({
  siswa,
  options,
  permissions,
}: {
  siswa: Siswa[];
  options: SiswaOptionLists;
  permissions: Permissions;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Siswa | null>(null);
  const [viewing, setViewing] = useState<Siswa | null>(null);
  const [deleting, setDeleting] = useState<Siswa | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(allColumns.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<ColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterGender, setFilterGender] = useState("");
  const [filterAgama, setFilterAgama] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLahirDari, setFilterLahirDari] = useState("");
  const [filterLahirSampai, setFilterLahirSampai] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<
    NonNullable<ImportSiswaResult["result"]> | null
  >(null);
  const [isExporting, setIsExporting] = useState(false);

  const agamaName = useMemo(
    () => new Map(options.agama.map((item) => [item.id, item.nama_agama])),
    [options.agama]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = siswa;

    if (needle) {
      result = result.filter((item) =>
        [item.nama_lengkap, item.nis ?? "", item.nisn ?? "", item.nama_ayah ?? "", item.nama_ibu ?? "", item.nama_wali ?? "", item.alamat ?? "", item.telepon_wali ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }

    if (filterGender) {
      result = result.filter((item) => item.jenis_kelamin === filterGender);
    }
    if (filterAgama) {
      result = result.filter((item) => (item.agama_id ?? "") === filterAgama);
    }
    if (filterStatus) {
      result = result.filter((item) => item.status === filterStatus);
    }
    if (filterLahirDari) {
      result = result.filter((item) => {
        const lahir = (item.tanggal_lahir ?? "").slice(0, 10);
        return !!lahir && lahir >= filterLahirDari;
      });
    }
    if (filterLahirSampai) {
      result = result.filter((item) => {
        const lahir = (item.tanggal_lahir ?? "").slice(0, 10);
        return !!lahir && lahir <= filterLahirSampai;
      });
    }

    return [...result].sort((a, b) => {
      let valA = "";
      let valB = "";
      switch (sortColumn) {
        case "nis":
          valA = a.nis ?? "";
          valB = b.nis ?? "";
          break;
        case "nisn":
          valA = a.nisn ?? "";
          valB = b.nisn ?? "";
          break;
        case "name":
          valA = a.nama_lengkap ?? "";
          valB = b.nama_lengkap ?? "";
          break;
        case "gender":
          valA = a.jenis_kelamin ?? "";
          valB = b.jenis_kelamin ?? "";
          break;
        case "birth_place":
          valA = a.tempat_lahir ?? "";
          valB = b.tempat_lahir ?? "";
          break;
        case "birth_date":
          valA = a.tanggal_lahir ?? "";
          valB = b.tanggal_lahir ?? "";
          break;
        case "address":
          valA = a.alamat ?? "";
          valB = b.alamat ?? "";
          break;
        case "father":
          valA = a.nama_ayah ?? "";
          valB = b.nama_ayah ?? "";
          break;
        case "mother":
          valA = a.nama_ibu ?? "";
          valB = b.nama_ibu ?? "";
          break;
        case "guardian":
          valA = a.nama_wali ?? "";
          valB = b.nama_wali ?? "";
          break;
        case "phone":
          valA = a.telepon_wali ?? "";
          valB = b.telepon_wali ?? "";
          break;
        case "status":
          valA = a.status ?? "";
          valB = b.status ?? "";
          break;
      }
      const cmp = valA.localeCompare(valB, "id", { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    siswa,
    query,
    filterGender,
    filterAgama,
    filterStatus,
    filterLahirDari,
    filterLahirSampai,
    sortColumn,
    sortDirection,
  ]);

  const activeFilterCount =
    (filterGender ? 1 : 0) +
    (filterAgama ? 1 : 0) +
    (filterStatus ? 1 : 0) +
    (filterLahirDari ? 1 : 0) +
    (filterLahirSampai ? 1 : 0);

  const hasActiveFilters = activeFilterCount > 0;

  const resetFilters = () => {
    setFilterGender("");
    setFilterAgama("");
    setFilterStatus("");
    setFilterLahirDari("");
    setFilterLahirSampai("");
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  );
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSort = (key: ColumnKey) => {
    if (sortColumn === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(key);
      setSortDirection("asc");
    }
  };

  const visibleColumnList = useMemo(
    () => allColumns.filter((col) => visibleColumns.has(col.key)),
    [visibleColumns]
  );

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteSiswa(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) {
        toast.success(result.success);
        setBanner(result.success);
      }
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setBanner(null);
    setEditing(null);
    setFormOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportSiswa({
        query,
        gender: filterGender,
        agama: filterAgama,
        status: filterStatus,
        lahirDari: filterLahirDari,
        lahirSampai: filterLahirSampai,
      });
      if (result.error || !result.data || !result.filename) {
        toast.error(result.error ?? "Gagal mengunduh data siswa.");
        return;
      }
      const binary = atob(result.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Data siswa berhasil diunduh.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    setImportResult(null);
    setImportFile(null);
    setImportOpen(true);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append("file", importFile);
    const result = await importSiswa(undefined, formData);
    if (result?.error) {
      toast.error(result.error);
    } else if (result?.result) {
      const r = result.result;
      if (r.success > 0) {
        toast.success(`${r.success} siswa berhasil diimpor.`);
        setBanner(`${r.success} siswa berhasil diimpor.`);
      }
      if (r.failed > 0) {
        toast.error(`${r.failed} baris gagal. ${r.errors.length} detail di console.`);
        console.table(r.errors);
      }
      setImportResult(r);
    }
    setImportOpen(false);
  };

  const openEdit = (item: Siswa) => {
    setBanner(null);
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">
            Manajemen Orang
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">
            Data Siswa
          </h1>
          <p className="mt-2 text-xs text-[#82978d]">
            Kelola data biodata siswa sekolah.
          </p>
        </div>
        {permissions.create ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreate}
              className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
            >
              <UserPlusIcon data-icon="inline-start" className="size-4" />
              Tambah Siswa
            </Button>
            {permissions.import ? (
              <Button
                variant="outline"
                onClick={handleImport}
                className="h-9 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
              >
                <UploadIcon data-icon="inline-start" className="size-4" />
                Import Excel
              </Button>
            ) : null}
            {permissions.export ? (
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting}
                className="h-9 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
              >
                <DownloadIcon data-icon="inline-start" className="size-4" />
                {isExporting ? "Menyiapkan..." : "Unduh Data"}
              </Button>
            ) : null}
          </div>
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
            <CardTitle className="font-heading text-[#21483b]">
              Daftar Siswa
            </CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {filtered.length} dari {siswa.length} siswa
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
                placeholder="Cari data siswa..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
              {isSearchFocused ? (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                  <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                    Pencarian mencakup
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Nama", "NIS", "NISN", "Nama Ayah", "Nama Ibu", "Nama Wali", "Alamat", "Telepon"].map(
                      (kolom) => (
                        <span
                          key={kolom}
                          className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]"
                        >
                          {kolom}
                        </span>
                      )
                    )}
                  </div>
                  <p className="mt-2.5 text-[10px] leading-relaxed text-[#8b9f95]">
                    Ketik satu kata — semua kolom di atas dicek sekaligus. Gunakan
                    Filter untuk menyaring per kolom.
                  </p>
                </div>
              ) : null}
            </div>
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
              {activeFilterCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#d06a5d] text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 shrink-0 border-[#e2ece5] bg-[#fff] text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                  />
                }
              >
                <Columns3Icon className="size-4 text-[#4d8669]" />
                <span className="text-[#537467]">Kolom</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-[#e2ece5] bg-[#fff] text-[#5d7a6e]"
              >
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    className="text-xs text-[#5d7a6e focus:bg-[#f4faf5]"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        {isFilterOpen ? (
          <div className="mx-6 mb-5 rounded-[12px] border border-[#e2ece5] bg-[#f7fbf8] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-heading text-[14px] font-semibold tracking-[-.03em] text-[#24483b]">
                  Filter Data Siswa
                </p>
                <p className="mt-0.5 text-[10px] text-[#93a49c]">
                  Kombinasikan beberapa filter untuk mempersempit hasil.
                </p>
              </div>
              {hasActiveFilters ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 gap-1.5 rounded-[8px] px-2.5 text-[10px] font-bold text-[#ad685d] hover:bg-[#fdf0ee] hover:text-[#ad685d]"
                >
                  <XIcon className="size-3.5" />
                  Hapus semua filter
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Jenis Kelamin
                </label>
                <select
                  value={filterGender}
                  onChange={(event) => {
                    setFilterGender(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Agama
                </label>
                <select
                  value={filterAgama}
                  onChange={(event) => {
                    setFilterAgama(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  {options.agama.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama_agama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(event) => {
                    setFilterStatus(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  <option value="aktif">Aktif</option>
                  <option value="lulus">Lulus</option>
                  <option value="pindah">Pindah</option>
                  <option value="keluar">Keluar</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Tanggal Lahir — Dari
                </label>
                <input
                  type="date"
                  value={filterLahirDari}
                  onChange={(event) => {
                    setFilterLahirDari(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Tanggal Lahir — Sampai
                </label>
                <input
                  type="date"
                  value={filterLahirSampai}
                  onChange={(event) => {
                    setFilterLahirSampai(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                />
              </div>
            </div>
          </div>
        ) : null}
        <CardContent className="px-0">
          <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                {visibleColumnList.map((col, index) => {
                 const isSorted = sortColumn === col.key;
                 const isNameCol = col.key === "name";
                 return (
                   <TableHead
                     key={col.key}
                     onClick={() => handleSort(col.key)}
                     className={`px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254] ${index === 0 ? "pl-6" : ""} ${isNameCol ? "sticky left-0 z-20 bg-white shadow-[8px_0_8px_-8px_#1c44331a]" : ""}`}
                   >
                      <div className="flex items-center gap-1.5">
                        <span className={isSorted ? "text-[#2b7254]" : ""}>
                          {col.label}
                        </span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUpIcon className="size-3.5 text-[#2b7254] shrink-0" />
                          ) : (
                            <ArrowDownIcon className="size-3.5 text-[#2b7254] shrink-0" />
                          )
                        ) : (
                          <ArrowUpDownIcon className="size-3.5 text-[#9aaa9f] shrink-0" />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
                <TableHead className="sticky right-0 z-20 w-10 pr-6 justify-end text-right text-[10px] font-bold text-[#6c8279] bg-white shadow-[-8px_0_8px_-8px_#1c44331a]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnList.length + 1}
                    className="h-32 border-b border-[#f0f5f1] px-3.5 py-3 text-center text-xs text-[#a0afa8]"
                  >
                    {query || hasActiveFilters ? (
                      <p className="text-sm text-[#a0afa8]">
                        Tidak ada siswa yang cocok dengan pencarian atau filter.
                      </p>
                    ) : (
                      <div className="py-6">
                        <p className="text-sm font-medium text-[#3e5c50]">
                          Belum ada siswa
                        </p>
                        <p className="text-sm text-[#a0afa8]">
                          {permissions.create
                            ? "Tambahkan siswa pertama untuk mulai."
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
                      switch (col.key) {
                        case "name":
                          return (
                            <TableCell
                              key={col.key}
                              className="sticky left-0 z-10 pl-6 px-3.5 py-3 align-middle bg-white group-hover:bg-[#f6fbf7] shadow-[8px_0_8px_-8px_#1c44331a]"
                            >
                              <div
                                className="flex items-center gap-3"
                                title={item.nama_lengkap ?? ""}
                              >
                                <div className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[9px] bg-[#def1e2] text-[#2b7254]">
                                  {item.photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={item.photo_url}
                                      alt={item.nama_lengkap}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-semibold">
                                      {getInitials(item.nama_lengkap)}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 min-w-[200px]">
                                  <div className="truncate text-[12px] font-semibold text-[#2b493e]">
                                    {item.nama_lengkap}
                                  </div>
                                  <div className="text-xs text-[#9aaa9f] sm:hidden truncate">
                                    {[item.nis, STATUS_LABEL[item.status]]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          );
                        case "nis":
                        case "nisn":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 font-mono text-[10px] text-[#7d9389] align-middle whitespace-nowrap"
                            >
                              {item[col.key] || "-"}
                            </TableCell>
                          );
                        case "gender":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle"
                            >
                              {item.jenis_kelamin === "L"
                                ? "Laki-laki"
                                : item.jenis_kelamin === "P"
                                  ? "Perempuan"
                                  : "-"}
                            </TableCell>
                          );
                        case "birth_place":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle whitespace-nowrap"
                            >
                              {item.tempat_lahir || "-"}
                            </TableCell>
                          );
                        case "birth_date":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle whitespace-nowrap"
                            >
                              {item.tanggal_lahir
                                ? new Date(item.tanggal_lahir).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "-"}
                            </TableCell>
                          );
                        case "address":
                          return (
                            <TableCell
                              key={col.key}
                              className="max-w-[200px] px-3.5 py-3 align-middle"
                            >
                              <span
                                className="block truncate text-xs text-[#3e5c50]"
                                title={item.alamat ?? ""}
                              >
                                {item.alamat || "-"}
                              </span>
                            </TableCell>
                          );
                        case "father":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle"
                            >
                              {item.nama_ayah || "-"}
                            </TableCell>
                          );
                        case "mother":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle"
                            >
                              {item.nama_ibu || "-"}
                            </TableCell>
                          );
                        case "guardian":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle"
                            >
                              {item.nama_wali || "-"}
                            </TableCell>
                          );
                        case "phone":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 font-mono text-[10px] text-[#7d9389] align-middle whitespace-nowrap"
                            >
                              {item.telepon_wali || "-"}
                            </TableCell>
                          );
                        case "status":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 align-middle"
                            >
                              <span
                                className={`rounded-[99px] px-2 py-1 text-[9px] font-bold ${STATUS_PILL[item.status]}`}
                              >
                                {STATUS_LABEL[item.status]}
                              </span>
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}
                    <TableCell className="sticky right-0 z-10 px-3 pr-6 py-3 align-middle bg-white group-hover:bg-[#f6fbf7] shadow-[-8px_0_8px_-8px_#1c44331a]">
                      {permissions.update || permissions.delete ? (
                        <div className="flex items-center justify-end gap-1">
                          {permissions.update ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Ubah"
                              className="border border-[#e1ebe4] bg-[#fff] text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(item);
                              }}
                            >
                              <PencilIcon className="size-4" />
                            </Button>
                          ) : null}
                          {permissions.delete ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Hapus"
                              className="border border-[#e1ebe4] bg-[#fff] text-[#537467] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleting(item);
                              }}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8b9f95]">
                Menampilkan {rangeStart}–{rangeEnd} dari {filtered.length} siswa
              </span>
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="siswa-page-size"
                  className="text-[10px] font-bold text-[#6c8279]"
                >
                  Baris
                </label>
                <select
                  id="siswa-page-size"
                  value={pageSize}
                  onChange={(event) => handlePageSizeChange(Number(event.target.value))}
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
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
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

      <SiswaDetailDialog siswa={viewing} agamaName={viewing ? agamaName.get(viewing.agama_id ?? "") : undefined} onClose={() => setViewing(null)} />

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data Siswa</DialogTitle>
            <DialogDescription>
              Unggah file Excel (.xlsx / .xls) untuk import data siswa secara bulk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImportFile(f);
                  setImportResult(null);
                }}
                className="flex-1"
              />
            </div>
            {importResult && (
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-semibold text-green-700">Berhasil: {importResult.success}</p>
                <p className="font-semibold text-red-700">Gagal: {importResult.failed}</p>
                {importResult.errors.length > 0 && (
                  <pre className="mt-2 max-h-40 overflow-auto text-xs text-muted-foreground">
                    {JSON.stringify(importResult.errors, null, 2)}
                  </pre>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Download template di{" "}
              <a
                href="/templates/template-import-siswa.xlsx"
                download
                className="text-primary underline"
              >
                sini
              </a>
              .
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
            <Button onClick={handleImportSubmit} disabled={!importFile || isPending}>
              Upload &amp; Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiswaFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        options={options}
        onSaved={(message) => setBanner(message)}
      />

      <AlertDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus siswa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.nama_lengkap} akan dihapus permanen dari data siswa
              sekolah Anda.
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

function selectOptions(
  items: { id: string; [key: string]: unknown }[],
  labelKey: string
): { value: string; label: string }[] {
  return items.map((item) => ({ value: item.id, label: String(item[labelKey]) }));
}

function SiswaFormDialog({
  open,
  onOpenChange,
  editing,
  options,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Siswa | null;
  options: SiswaOptionLists;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveSiswa,
    undefined
  );
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      onSaved(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange, onSaved]);

  // Bersihkan object URL pratinjau setiap kali dialog ditutup.
  const handleOpenChange = (next: boolean) => {
    if (!next && photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
      setPhotoName(null);
    }
    onOpenChange(next);
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoName(file.name);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[870px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">
              Data siswa
            </span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {isEdit ? "Ubah Siswa" : "Tambah Siswa"}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
              Isi data biodata siswa. Nomor induk (NIS/NISN) dapat salah satu diisi, atau keduanya.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <input type="hidden" name="photo_url" value={editing?.photo_url ?? ""} />

          <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* ===== Foto ===== */}
          <div className="mb-6 flex items-center gap-4">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#cfe6d4] bg-[#f6fbf7] text-[#9bbfa5]">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Pratinjau foto siswa" className="h-full w-full object-cover" />
              ) : editing?.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editing.photo_url} alt={editing.nama_lengkap} className="h-full w-full object-cover" />
              ) : (
                <ImagePlusIcon className="size-6" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#2b493e]">Foto Siswa</p>
              <p className="mt-1 text-[10px] text-[#93a49c]">
                {photoName ? `Dipilih: ${photoName}. ` : ""}JPG/PNG/WebP maksimal 2 MB.
              </p>
              <input
                ref={photoInputRef}
                type="file"
                name="photo"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-8 rounded-[9px] border-[#d7e6dc] bg-white text-[10px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
                onClick={() => photoInputRef.current?.click()}
              >
                Upload Foto
              </Button>
            </div>
          </div>

          {/* ===== Identitas ===== */}
          <h3 className="mb-1 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Identitas</h3>
          <p className="mb-4 text-[10px] text-[#93a49c]">Data pribadi siswa.</p>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel htmlFor="nama_lengkap" required>Nama Lengkap</FieldLabel>
              <Input
                id="nama_lengkap"
                name="nama_lengkap"
                defaultValue={editing?.nama_lengkap ?? ""}
                placeholder="Contoh: Budi Santoso"
                required
                autoFocus
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="nis" required>NIS</FieldLabel>
              <Input
                id="nis"
                name="nis"
                defaultValue={editing?.nis ?? ""}
                placeholder="Nomor Induk Siswa"
                required
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="nisn">NISN</FieldLabel>
              <Input
                id="nisn"
                name="nisn"
                defaultValue={editing?.nisn ?? ""}
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="jenis_kelamin" required>Jenis Kelamin</FieldLabel>
              <select
                id="jenis_kelamin"
                name="jenis_kelamin"
                defaultValue={editing?.jenis_kelamin ?? ""}
                required
                className="h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              >
                <option value="">- tidak diisi -</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tempat_lahir" required>Tempat Lahir</FieldLabel>
              <Input
                id="tempat_lahir"
                name="tempat_lahir"
                defaultValue={editing?.tempat_lahir ?? ""}
                required
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="tanggal_lahir" required>Tanggal Lahir</FieldLabel>
              <Input
                id="tanggal_lahir"
                name="tanggal_lahir"
                type="date"
                defaultValue={editing?.tanggal_lahir ?? ""}
                required
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel htmlFor="agama_id">Agama <span className="text-[#93a49c]">(opsional)</span></FieldLabel>
              <select
                id="agama_id"
                name="agama_id"
                defaultValue={editing?.agama_id ?? ""}
                className="h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              >
                <option value="">- tidak diisi -</option>
                {selectOptions(options.agama, "nama_agama").map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ===== Wali ===== */}
          <h3 className="mb-1 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Wali</h3>
          <p className="mb-4 text-[10px] text-[#93a49c]">Data kontak wali siswa.</p>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel htmlFor="nama_ayah">Nama Ayah</FieldLabel>
              <Input
                id="nama_ayah"
                name="nama_ayah"
                defaultValue={editing?.nama_ayah ?? ""}
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="nama_ibu">Nama Ibu</FieldLabel>
              <Input
                id="nama_ibu"
                name="nama_ibu"
                defaultValue={editing?.nama_ibu ?? ""}
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel htmlFor="nama_wali">Nama Wali</FieldLabel>
              <Input
                id="nama_wali"
                name="nama_wali"
                defaultValue={editing?.nama_wali ?? ""}
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <FieldLabel htmlFor="telepon_wali">Telepon Wali</FieldLabel>
              <Input
                id="telepon_wali"
                name="telepon_wali"
                defaultValue={editing?.telepon_wali ?? ""}
                placeholder="08xx"
                className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
              />
            </div>
          </div>

          {/* ===== Alamat ===== */}
          <h3 className="mb-1 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Alamat</h3>
          <p className="mb-4 text-[10px] text-[#93a49c]">Alamat tempat tinggal siswa.</p>
          <div className="mb-6 space-y-2">
            <FieldLabel htmlFor="alamat">Alamat</FieldLabel>
            <Input
              id="alamat"
              name="alamat"
              defaultValue={editing?.alamat ?? ""}
              className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
            />
          </div>

          {/* ===== Status ===== */}
          <h3 className="mb-1 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Status</h3>
          <p className="mb-4 text-[10px] text-[#93a49c]">Status kehadiran siswa.</p>
          <div className="space-y-2">
            <FieldLabel htmlFor="status_select">Status</FieldLabel>
            <select
              id="status_select"
              name="status"
              defaultValue={editing?.status ?? "aktif"}
              className="h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10"
            >
              <option value="aktif">Aktif</option>
              <option value="lulus">Lulus</option>
              <option value="pindah">Pindah</option>
              <option value="keluar">Keluar</option>
            </select>
           </div>
          </div>

          <DialogFooter>
            <div className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
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
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Siswa"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold uppercase tracking-[.04em] text-[#8b9f95]">
        {label}
      </dt>
      <dd className="mt-1 truncate text-xs text-[#2b493e]" title={typeof value === "string" ? value : undefined}>
        {value || "-"}
      </dd>
    </div>
  );
}

function SiswaDetailDialog({
  siswa,
  agamaName,
  onClose,
}: {
  siswa: Siswa | null;
  agamaName?: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(siswa)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[760px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">Data siswa</span>
          <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Detail Siswa
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
            Ringkasan informasi siswa.
          </DialogDescription>
        </DialogHeader>

        {siswa ? (
          <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-4">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[14px] border-2 border-[#e2ece5] bg-[#def1e2] text-[#2b7254]">
                {siswa.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={siswa.photo_url}
                    alt={siswa.nama_lengkap}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base font-semibold">
                    {getInitials(siswa.nama_lengkap)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#2b493e]">{siswa.nama_lengkap}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-[99px] px-2 py-1 text-[9px] font-bold ${STATUS_PILL[siswa.status]}`}
                  >
                    {STATUS_LABEL[siswa.status]}
                  </span>
                </div>
              </div>
            </div>

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Dasar</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow label="NIS" value={siswa.nis} />
              <DetailRow label="NISN" value={siswa.nisn} />
              <DetailRow
                label="Jenis Kelamin"
                value={
                  siswa.jenis_kelamin === "L"
                    ? "Laki-laki"
                    : siswa.jenis_kelamin === "P"
                      ? "Perempuan"
                      : null
                }
              />
              <DetailRow label="Tempat Lahir" value={siswa.tempat_lahir} />
              <DetailRow label="Tanggal Lahir" value={siswa.tanggal_lahir} />
              <DetailRow label="Agama" value={agamaName} />
            </dl>

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Wali</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4">
              <DetailRow label="Nama Ayah" value={siswa.nama_ayah} />
              <DetailRow label="Nama Ibu" value={siswa.nama_ibu} />
              <DetailRow label="Nama Wali" value={siswa.nama_wali} />
              <DetailRow label="Telepon Wali" value={siswa.telepon_wali} />
            </dl>

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Alamat</h3>
            <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4">
              <DetailRow label="Alamat" value={siswa.alamat} />
            </dl>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
