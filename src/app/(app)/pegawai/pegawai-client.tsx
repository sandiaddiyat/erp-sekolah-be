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
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  DownloadIcon,
  FilterIcon,
  ImagePlusIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheck,
  Trash2Icon,
  UploadIcon,
  UserIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  FormState,
  Pegawai,
  PegawaiPendidikan,
  PegawaiSertifikasi,
} from "@/lib/types";
import { deletePegawai, savePegawai } from "./actions";
import { importPegawai } from "./import-action";
import { exportPegawai } from "./export-action";
import type { ImportPegawaiResult } from "./import-action";
import type { PegawaiJabatanInfo, PegawaiOptionLists } from "./page";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type Permissions = {
  create: boolean;
  update: boolean;
  delete: boolean;
  export: boolean;
  import: boolean;
};

type ColumnKey =
  | "name"
  | "nip"
  | "niy"
  | "nuptk"
  | "gender"
  | "phone"
  | "email"
  | "alamat"
  | "status"
  | "role"
  | "unit"
  | "tahun_masuk";

const allColumns: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Nama" },
  { key: "nip", label: "NIP" },
  { key: "niy", label: "NIY" },
  { key: "nuptk", label: "NUPTK" },
  { key: "gender", label: "Jenis Kelamin" },
  { key: "phone", label: "Telepon" },
  { key: "email", label: "Email" },
  { key: "alamat", label: "Alamat" },
  { key: "status", label: "Status Kepegawaian" },
  { key: "role", label: "Jabatan Utama" },
  { key: "unit", label: "Unit Kerja" },
  { key: "tahun_masuk", label: "Tahun Masuk" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function PegawaiClient({
  pegawai,
  options,
  pegawaiJabatan,
  pegawaiPendidikan,
  pegawaiSertifikasi,
  permissions,
  uploadPegawaiPhotoAction,
  schoolId,
}: {
  pegawai: Pegawai[];
  options: PegawaiOptionLists;
  pegawaiJabatan: Record<string, PegawaiJabatanInfo[]>;
  pegawaiPendidikan: Record<string, PegawaiPendidikan[]>;
  pegawaiSertifikasi: Record<string, PegawaiSertifikasi[]>;
  permissions: Permissions;
  uploadPegawaiPhotoAction: (formData: FormData) => Promise<{ url?: string; error?: string }>;
  schoolId: string;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pegawai | null>(null);
  const [viewing, setViewing] = useState<Pegawai | null>(null);
  const [deleting, setDeleting] = useState<Pegawai | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<
    NonNullable<ImportPegawaiResult["result"]> | null
  >(null);
  const [isPending, startTransition] = useTransition();

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(allColumns.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<ColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterGender, setFilterGender] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterJabatan, setFilterJabatan] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterMasukDari, setFilterMasukDari] = useState("");
  const [filterMasukSampai, setFilterMasukSampai] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const statusName = useMemo(
    () => new Map(options.status_kepegawaian.map((item) => [item.id, item.nama_status])),
    [options.status_kepegawaian]
  );

  const unitKerjaName = useMemo(
    () => new Map(options.unit_kerja.map((item) => [item.id, item.nama_unit])),
    [options.unit_kerja]
  );

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

  const filteredAndSorted = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let result = pegawai;

    if (needle) {
      result = result.filter((item) => {
        const jabatanGabungan = (pegawaiJabatan[item.id] ?? [])
          .map((info) => info.nama)
          .join(" ");
        return [
          item.full_name,
          item.nip ?? "",
          item.niy ?? "",
          item.nuptk ?? "",
          item.phone ?? "",
          item.email ?? "",
          item.alamat ?? "",
          jabatanGabungan,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    }

    const jabatanUtama = (id: string) =>
      (pegawaiJabatan[id] ?? []).find((info) => info.is_utama)?.nama ?? "";

    if (filterGender) {
      result = result.filter((item) => item.jenis_kelamin === filterGender);
    }
    if (filterStatus) {
      result = result.filter(
        (item) => (item.status_kepegawaian_id ?? "") === filterStatus
      );
    }
    if (filterJabatan) {
      result = result.filter(
        (item) => jabatanUtama(item.id) === filterJabatan
      );
    }
    if (filterUnit) {
      result = result.filter((item) => (item.unit_kerja_id ?? "") === filterUnit);
    }
    if (filterMasukDari) {
      const dari = filterMasukDari.slice(0, 10);
      result = result.filter((item) => {
        const masuk = (item.tahun_masuk ?? "").slice(0, 10);
        return !!masuk && masuk >= dari;
      });
    }
    if (filterMasukSampai) {
      const sampai = filterMasukSampai.slice(0, 10);
      result = result.filter((item) => {
        const masuk = (item.tahun_masuk ?? "").slice(0, 10);
        return !!masuk && masuk <= sampai;
      });
    }

    return [...result].sort((a, b) => {
      let valA = "";
      let valB = "";

      switch (sortColumn) {
        case "name":
          valA = a.full_name ?? "";
          valB = b.full_name ?? "";
          break;
        case "nip":
          valA = a.nip ?? "";
          valB = b.nip ?? "";
          break;
        case "niy":
          valA = a.niy ?? "";
          valB = b.niy ?? "";
          break;
        case "nuptk":
          valA = a.nuptk ?? "";
          valB = b.nuptk ?? "";
          break;
        case "gender":
          valA = a.jenis_kelamin ?? "";
          valB = b.jenis_kelamin ?? "";
          break;
        case "phone":
          valA = a.phone ?? "";
          valB = b.phone ?? "";
          break;
        case "email":
          valA = a.email ?? "";
          valB = b.email ?? "";
          break;
        case "alamat":
          valA = a.alamat ?? "";
          valB = b.alamat ?? "";
          break;
        case "status":
          valA = statusName.get(a.status_kepegawaian_id ?? "") ?? "";
          valB = statusName.get(b.status_kepegawaian_id ?? "") ?? "";
          break;
        case "role":
          valA =
            (pegawaiJabatan[a.id] ?? []).find((info) => info.is_utama)?.nama ?? "";
          valB =
            (pegawaiJabatan[b.id] ?? []).find((info) => info.is_utama)?.nama ?? "";
          break;
        case "unit":
          valA = unitKerjaName.get(a.unit_kerja_id ?? "") ?? "";
          valB = unitKerjaName.get(b.unit_kerja_id ?? "") ?? "";
          break;
        case "tahun_masuk":
          valA = a.tahun_masuk ?? "";
          valB = b.tahun_masuk ?? "";
          break;
      }

      const cmp = valA.localeCompare(valB, "id", { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [
    pegawai,
    query,
    pegawaiJabatan,
    sortColumn,
    sortDirection,
    statusName,
    unitKerjaName,
    filterGender,
    filterStatus,
    filterJabatan,
    filterUnit,
    filterMasukDari,
    filterMasukSampai,
  ]);

  const activeFilterCount =
    (filterGender ? 1 : 0) +
    (filterStatus ? 1 : 0) +
    (filterJabatan ? 1 : 0) +
    (filterUnit ? 1 : 0) +
    (filterMasukDari ? 1 : 0) +
    (filterMasukSampai ? 1 : 0);

  const jabatanUtamaList = useMemo(() => {
    const names = new Set<string>();
    for (const rows of Object.values(pegawaiJabatan)) {
      for (const info of rows) {
        if (info.is_utama) names.add(info.nama);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, "id"));
  }, [pegawaiJabatan]);

  const hasActiveFilters = activeFilterCount > 0;

  const resetFilters = () => {
    setFilterGender("");
    setFilterStatus("");
    setFilterJabatan("");
    setFilterUnit("");
    setFilterMasukDari("");
    setFilterMasukSampai("");
  };

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () =>
      filteredAndSorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredAndSorted, safePage, pageSize]
  );
  const rangeStart = filteredAndSorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filteredAndSorted.length);

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportPegawai({
        query,
        gender: filterGender,
        status: filterStatus,
        jabatan: filterJabatan,
        unit: filterUnit,
        masukDari: filterMasukDari,
        masukSampai: filterMasukSampai,
      });
      if (result.error || !result.data || !result.filename) {
        toast.error(result.error ?? "Gagal mengunduh data pegawai.");
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
      toast.success("Data pegawai berhasil diunduh.");
    } finally {
      setIsExporting(false);
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
      const result = await deletePegawai(target.id);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setBanner(null);
    setEditing(null);
    setFormOpen(true);
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
    const result = await importPegawai(undefined, formData);
    if (result?.error) {
      toast.error(result.error);
    } else if (result?.result) {
      const r = result.result;
      if (r.success > 0) {
        toast.success(`${r.success} pegawai berhasil diimpor.`);
      }
      if (r.failed > 0) {
        toast.error(`${r.failed} baris gagal. ${r.errors.length} detail di console.`);
        console.table(r.errors);
      }
      setImportResult(r);
    }
    setImportOpen(false);
  };

  const openEdit = (item: Pegawai) => {
    setBanner(null);
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 employee-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]">Manajemen orang</span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">Data Pegawai</h1>
          <p className="text-sm text-muted-foreground">Kelola data kepegawaian sekolah dengan lebih teratur.</p>
        </div>
        {permissions.create ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={openCreate}
              className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
            >
              <UserPlusIcon data-icon="inline-start" className="size-4" />
              Tambah Pegawai
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
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between employee-card__heading">
          <div>
            <CardTitle className="font-heading text-[#21483b]">
              Daftar Pegawai
            </CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {filteredAndSorted.length} dari {pegawai.length} pegawai
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
                placeholder="Cari data pegawai..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
              {isSearchFocused ? (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                  <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                    Pencarian mencakup
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {["Nama", "NIP", "NIY", "NUPTK", "Telepon", "Email", "Alamat", "Jabatan"].map(
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
                  Filter Data Pegawai
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
                  Status Kepegawaian
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
                  {options.status_kepegawaian.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama_status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Jabatan Utama
                </label>
                <select
                  value={filterJabatan}
                  onChange={(event) => {
                    setFilterJabatan(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  {jabatanUtamaList.map((nama) => (
                    <option key={nama} value={nama}>
                      {nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Unit Kerja
                </label>
                <select
                  value={filterUnit}
                  onChange={(event) => {
                    setFilterUnit(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  {options.unit_kerja.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama_unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Tahun Masuk — Dari
                </label>
                <input
                  type="date"
                  value={filterMasukDari}
                  onChange={(event) => {
                    setFilterMasukDari(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">
                  Tahun Masuk — Sampai
                </label>
                <input
                  type="date"
                  value={filterMasukSampai}
                  onChange={(event) => {
                    setFilterMasukSampai(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                />
              </div>
            </div>
          </div>
        ) : null}
        <CardContent className="px-0">
          <div className="overflow-x-auto">
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
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnList.length + 1}
                    className="h-32 border-b border-[#f0f5f1] px-3.5 py-3 text-center text-xs text-[#a0afa8]"
                  >
                    {query ? (
                      <p className="text-sm text-[#a0afa8]">
                        Tidak ada pegawai yang cocok dengan pencarian &quot;{query}&quot;.
                      </p>
                    ) : (
                      <div className="py-6">
                        <p className="text-sm font-medium text-[#3e5c50]">
                          Belum ada pegawai
                        </p>
                        <p className="text-sm text-[#a0afa8]">
                          {permissions.create
                            ? "Tambahkan pegawai pertama untuk mulai."
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
                                title={item.full_name ?? ""}
                              >
                            <Avatar className="size-8 shrink-0 rounded-[9px] cell-avatar">
                              {item.photo_url ? (
                                <AvatarImage src={item.photo_url} alt={item.full_name ?? "Pegawai"} />
                              ) : null}
                              <AvatarFallback className="bg-[#def1e2] text-[#2b7254] font-semibold">
                                {getInitials(item.full_name ?? "")}
                              </AvatarFallback>
                            </Avatar>
                                <div className="min-w-0 min-w-[200px]">
                                  <div className="truncate text-[12px] font-semibold text-[#2b493e]">
                                    {item.full_name}
                                  </div>
                                  <div className="text-xs text-[#9aaa9f] sm:hidden truncate">
                                    {[
                                      item.nip,
                                      statusName.get(item.status_kepegawaian_id ?? ""),
                                    ]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          );
                        case "nip":
                        case "niy":
                        case "nuptk":
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
                        case "phone":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 font-mono text-[10px] text-[#7d9389] align-middle whitespace-nowrap"
                            >
                              {item.phone || "-"}
                            </TableCell>
                          );
                        case "email":
                          return (
                            <TableCell
                              key={col.key}
                              className="max-w-[180px] px-3.5 py-3 align-middle"
                            >
                              <span
                                className="block truncate text-xs text-[#3e5c50]"
                                title={item.email ?? ""}
                              >
                                {item.email || "-"}
                              </span>
                            </TableCell>
                          );
                        case "alamat":
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
                        case "status": {
                          const statusText = statusName.get(
                            item.status_kepegawaian_id ?? ""
                          );
                          const isPermanent =
                            !!statusText &&
                            statusText.toLowerCase().includes("tetap") &&
                            !statusText.toLowerCase().includes("tidak");
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 align-middle"
                            >
                              {statusText ? (
                                <Badge
                                  className={
                                    isPermanent
                                      ? "rounded-[5px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254]"
                                      : "rounded-[5px] border-transparent bg-[#fcf3e3] px-[8px] py-[4px] text-[9px] font-bold text-[#a67437]"
                                  }
                                >
                                  {statusText}
                                </Badge>
                              ) : (
                                <span className="text-xs text-[#7d9389]">-</span>
                              )}
                            </TableCell>
                          );
                        }
                        case "role": {
                          const jabatanUtama = (pegawaiJabatan[item.id] ?? []).find(
                            (info) => info.is_utama
                          );
                          const roleLabel = jabatanUtama?.nama ?? "-";
                          return (
                            <TableCell
                              key={col.key}
                              className="max-w-[180px] px-3.5 py-3 align-middle"
                            >
                              <span
                                className="block truncate text-xs text-[#5d7a6e]"
                                title={roleLabel}
                              >
                                {roleLabel}
                              </span>
                            </TableCell>
                          );
                        }
                        case "unit":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle"
                            >
                              {unitKerjaName.get(item.unit_kerja_id ?? "") || "-"}
                            </TableCell>
                          );
                        case "tahun_masuk":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle whitespace-nowrap"
                            >
                              {item.tahun_masuk || "-"}
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
                Menampilkan {rangeStart}–{rangeEnd} dari {filteredAndSorted.length} pegawai
              </span>
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="page-size"
                  className="text-[10px] font-bold text-[#6c8279]"
                >
                  Baris
                </label>
                <select
                  id="page-size"
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

      <PegawaiDetailDialog
        pegawai={viewing}
        onClose={() => setViewing(null)}
        options={options}
        jabatan={viewing ? (pegawaiJabatan[viewing.id] ?? []) : []}
        pendidikan={viewing ? (pegawaiPendidikan[viewing.id] ?? []) : []}
        sertifikasi={viewing ? (pegawaiSertifikasi[viewing.id] ?? []) : []}
      />

      <PegawaiFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        options={options}
        jabatanTerpilih={editing ? (pegawaiJabatan[editing.id] ?? []) : []}
        pendidikanAwal={editing ? (pegawaiPendidikan[editing.id] ?? []) : []}
        sertifikasiAwal={editing ? (pegawaiSertifikasi[editing.id] ?? []) : []}
        uploadPegawaiPhotoAction={uploadPegawaiPhotoAction}
        schoolId={schoolId}
        onSaved={(message) => setBanner(message)}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pegawai ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.full_name} akan dihapus permanen dari data pegawai sekolah Anda.
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

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Data Pegawai</DialogTitle>
            <DialogDescription>
              Unggah file Excel (.xlsx / .xls) untuk import data pegawai secara bulk.
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
                href="/templates/template-import-pegawai.xlsx"
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
              Upload & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type PendidikanFormRow = {
  jenjang_pendidikan_id: string;
  jurusan: string;
  nama_institusi: string;
  tahun_lulus: string;
};

type SertifikasiFormRow = {
  nama_sertifikasi: string;
  tanggal_berlaku: string;
  tanggal_kedaluwarsa: string;
  nomor_sertifikat: string;
  penerbit: string;
};

const FORM_TABS = [
  { value: "basic", label: "Informasi Dasar" },
  { value: "employment", label: "Informasi Kepegawaian" },
  { value: "education", label: "Riwayat Pendidikan" },
  { value: "certification", label: "Sertifikasi" },
] as const;

const emptyPendidikanRow = (): PendidikanFormRow => ({
  jenjang_pendidikan_id: "",
  jurusan: "",
  nama_institusi: "",
  tahun_lulus: "",
});

const emptySertifikasiRow = (): SertifikasiFormRow => ({
  nama_sertifikasi: "",
  tanggal_berlaku: "",
  tanggal_kedaluwarsa: "",
  nomor_sertifikat: "",
  penerbit: "",
});

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

function PegawaiDetailDialog({
  pegawai,
  onClose,
  options,
  jabatan,
  pendidikan,
  sertifikasi,
}: {
  pegawai: Pegawai | null;
  onClose: () => void;
  options: PegawaiOptionLists;
  jabatan: PegawaiJabatanInfo[];
  pendidikan: PegawaiPendidikan[];
  sertifikasi: PegawaiSertifikasi[];
}) {
  const statusText = pegawai
    ? (options.status_kepegawaian.find((item) => item.id === pegawai.status_kepegawaian_id)?.nama_status ?? null)
    : null;
  const isPermanent =
    !!statusText &&
    statusText.toLowerCase().includes("tetap") &&
    !statusText.toLowerCase().includes("tidak");
  const agamaName = pegawai
    ? (options.agama.find((item) => item.id === pegawai.agama_id)?.nama_agama ?? null)
    : null;
  const golonganCode = pegawai
    ? (options.golongan.find((item) => item.id === pegawai.golongan_id)?.kode_golongan ?? null)
    : null;
  const unitName = pegawai
    ? (options.unit_kerja.find((item) => item.id === pegawai.unit_kerja_id)?.nama_unit ?? null)
    : null;

  return (
    <Dialog open={Boolean(pegawai)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[760px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">Data kepegawaian</span>
          <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Detail Pegawai
          </DialogTitle>
          <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
            Ringkasan informasi pegawai.
          </DialogDescription>
        </DialogHeader>

        {pegawai ? (
          <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 shrink-0 rounded-[14px] border-2 border-[#e2ece5]">
                {pegawai.photo_url ? (
                  <AvatarImage src={pegawai.photo_url} alt={pegawai.full_name} />
                ) : null}
                <AvatarFallback className="rounded-[14px] bg-[#def1e2] text-[#2b7254] font-semibold">
                  {getInitials(pegawai.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#2b493e]">{pegawai.full_name}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {statusText ? (
                    <Badge
                      className={
                        isPermanent
                          ? "rounded-[5px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254]"
                          : "rounded-[5px] border-transparent bg-[#fcf3e3] px-[8px] py-[4px] text-[9px] font-bold text-[#a67437]"
                      }
                    >
                      {statusText}
                    </Badge>
                  ) : null}
                  <Badge
                    className={
                      pegawai.is_active
                        ? "rounded-[99px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254] gap-[5px]"
                        : "rounded-[99px] border-transparent bg-[#fdf0ee] px-[8px] py-[4px] text-[9px] font-bold text-[#ad685d] gap-[5px]"
                    }
                  >
                    <span
                      className={
                        "size-[5px] shrink-0 rounded-full " +
                        (pegawai.is_active ? "bg-[#2b7254]" : "bg-[#ad685d]")
                      }
                    />
                    {pegawai.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
              </div>
            </div>

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Dasar</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow label="NIP" value={pegawai.nip} />
              <DetailRow label="NIY" value={pegawai.niy} />
              <DetailRow label="NUPTK" value={pegawai.nuptk} />
              <DetailRow
                label="Jenis Kelamin"
                value={
                  pegawai.jenis_kelamin === "L"
                    ? "Laki-laki"
                    : pegawai.jenis_kelamin === "P"
                      ? "Perempuan"
                      : null
                }
              />
              <DetailRow label="Tempat Lahir" value={pegawai.tempat_lahir} />
              <DetailRow label="Tanggal Lahir" value={pegawai.tanggal_lahir} />
              <DetailRow label="Agama" value={agamaName} />
            </dl>

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Kontak</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4">
              <DetailRow label="Telepon" value={pegawai.phone} />
              <DetailRow label="Email" value={pegawai.email} />
              <div className="col-span-2">
                <DetailRow label="Alamat" value={pegawai.alamat} />
              </div>
            </dl>

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Kepegawaian</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow
                label="Jabatan Utama"
                value={jabatan.find((info) => info.is_utama)?.nama ?? null}
              />
              <DetailRow label="Golongan" value={golonganCode} />
              <DetailRow label="Unit Kerja" value={unitName} />
              <DetailRow label="Tahun Masuk" value={pegawai.tahun_masuk} />
            </dl>
            {jabatan.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {jabatan.map((info) => (
                  <Badge
                    key={info.jabatan_id}
                    className="rounded-[99px] border-transparent bg-[#eef6f0] px-[8px] py-[4px] text-[9px] font-bold text-[#4b8669]"
                  >
                    {info.is_utama ? "★ " : ""}{info.nama}
                  </Badge>
                ))}
              </div>
            ) : null}

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Riwayat Pendidikan</h3>
            {pendidikan.length === 0 ? (
              <p className="mt-2 text-xs text-[#a0afa8]">Belum ada riwayat pendidikan.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {pendidikan.map((row, index) => (
                  <li
                    key={index}
                    className="rounded-[9px] border border-[#e9efeb] bg-white px-3.5 py-2.5"
                  >
                    <p className="text-xs font-bold text-[#2b493e]">
                      {options.jenjang_pendidikan.find((item) => item.id === row.jenjang_pendidikan_id)?.nama_jenjang ?? "Pendidikan"}
                      {row.jurusan ? ` — ${row.jurusan}` : ""}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#8b9f95]">
                      {[row.nama_institusi, row.tahun_lulus].filter(Boolean).join(" • ") || "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Sertifikasi</h3>
            {sertifikasi.length === 0 ? (
              <p className="mt-2 text-xs text-[#a0afa8]">Belum ada sertifikasi.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {sertifikasi.map((row, index) => (
                  <li
                    key={index}
                    className="rounded-[9px] border border-[#e9efeb] bg-white px-3.5 py-2.5"
                  >
                    <p className="text-xs font-bold text-[#2b493e]">{row.nama_sertifikasi}</p>
                    <p className="mt-0.5 text-[10px] text-[#8b9f95]">
                      {[
                        row.nomor_sertifikat,
                        row.penerbit,
                        [row.tanggal_berlaku, row.tanggal_kedaluwarsa].filter(Boolean).join(" s.d. "),
                      ]
                        .filter(Boolean)
                        .join(" • ") || "-"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end">
          <Button
            type="button"
            onClick={onClose}
            className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PegawaiFormDialog({
  open,
  onOpenChange,
  editing,
  options,
  jabatanTerpilih,
  pendidikanAwal,
  sertifikasiAwal,
  uploadPegawaiPhotoAction,
  schoolId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Pegawai | null;
  options: PegawaiOptionLists;
  jabatanTerpilih: PegawaiJabatanInfo[];
  pendidikanAwal: PegawaiPendidikan[];
  sertifikasiAwal: PegawaiSertifikasi[];
  uploadPegawaiPhotoAction: (formData: FormData) => Promise<{ url?: string; error?: string }>;
  schoolId: string;
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [activeTab, setActiveTab] = useState("basic");
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(editing?.photo_url ?? null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedJabatanIds, setSelectedJabatanIds] = useState<string[]>(
    jabatanTerpilih.map((info) => info.jabatan_id)
  );
  const [pendidikanRows, setPendidikanRows] = useState<PendidikanFormRow[]>(
    pendidikanAwal.map((row) => ({
      jenjang_pendidikan_id: row.jenjang_pendidikan_id ?? "",
      jurusan: row.jurusan ?? "",
      nama_institusi: row.nama_institusi ?? "",
      tahun_lulus: row.tahun_lulus ?? "",
    }))
  );
  const [sertifikasiRows, setSertifikasiRows] = useState<SertifikasiFormRow[]>(
    sertifikasiAwal.map((row) => ({
      nama_sertifikasi: row.nama_sertifikasi,
      tanggal_berlaku: row.tanggal_berlaku ?? "",
      tanggal_kedaluwarsa: row.tanggal_kedaluwarsa ?? "",
      nomor_sertifikat: row.nomor_sertifikat ?? "",
      penerbit: row.penerbit ?? "",
    }))
  );
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    savePegawai,
    undefined
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onSaved(state.success);
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange, onSaved]);

  const selectClass =
    "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

  const inputClass =
    "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

  const jabatanOptions = options.jabatan.map((jabatan) => ({
    value: jabatan.id,
    label: jabatan.nama_jabatan,
  }));

  const updatePendidikanRow = (index: number, patch: Partial<PendidikanFormRow>) => {
    setPendidikanRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const updateSertifikasiRow = (index: number, patch: Partial<SertifikasiFormRow>) => {
    setSertifikasiRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Ukuran foto maksimal 2 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setUploadError("Hanya file gambar yang diperbolehkan.");
      return;
    }

    setPhotoName(file.name);
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("school_id", schoolId);

    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await uploadPegawaiPhotoAction(formData);
      if (res.error) {
        setUploadError(res.error);
      } else if (res.url) {
        setPhotoUrl(res.url);
      }
    } finally {
      setIsUploading(false);
    }
    e.target.value = "";
  };

  const activeTabIndex = FORM_TABS.findIndex((tab) => tab.value === activeTab);
  const isFirstTab = activeTabIndex === 0;
  const isLastTab = activeTabIndex === FORM_TABS.length - 1;
  const goToNextTab = () => {
    if (!isLastTab) {
      setActiveTab(FORM_TABS[activeTabIndex + 1].value);
    }
  };
  const goToPrevTab = () => {
    if (!isFirstTab) {
      setActiveTab(FORM_TABS[activeTabIndex - 1].value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[870px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4d9775]">Data kepegawaian</span>
            <DialogTitle className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {isEdit ? "Ubah Pegawai" : "Tambah Pegawai"}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-[#83988e] mt-[7px]">
              Lengkapi informasi pegawai untuk menyimpan data baru.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />
          {selectedJabatanIds.map((id) => (
            <input key={id} type="hidden" name="jabatan_ids" value={id} />
          ))}
          <input
            type="hidden"
            name="pendidikan"
            value={JSON.stringify(
              pendidikanRows.map((row) => ({
                jenjang_pendidikan_id: row.jenjang_pendidikan_id || undefined,
                jurusan: row.jurusan || undefined,
                nama_institusi: row.nama_institusi || undefined,
                tahun_lulus: row.tahun_lulus || undefined,
              }))
            )}
          />
          <input
            type="hidden"
            name="sertifikasi"
            value={JSON.stringify(
              sertifikasiRows.map((row) => ({
                nama_sertifikasi: row.nama_sertifikasi || undefined,
                tanggal_berlaku: row.tanggal_berlaku || undefined,
                tanggal_kedaluwarsa: row.tanggal_kedaluwarsa || undefined,
                nomor_sertifikat: row.nomor_sertifikat || undefined,
                penerbit: row.penerbit || undefined,
              }))
            )}
          />

          <div className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))} className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start gap-0.5 rounded-none border-b border-[#e5eee8] bg-white p-0 group-data-horizontal/tabs:h-auto overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {FORM_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-auto flex-none rounded-none border-0 bg-transparent px-4 py-[13px] text-[11px] font-bold text-[#83988e] after:bottom-0 after:bg-[#185743] hover:bg-[#f6fbf7] hover:text-[#2b7254] focus-visible:ring-0 focus-visible:outline-none data-active:text-[#185743] dark:bg-transparent dark:text-[#83988e] dark:data-active:text-[#185743] dark:data-active:border-transparent"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ===== Tab 1: Informasi Dasar ===== */}
            <TabsContent value="basic" keepMounted className="space-y-4 pt-[17px]">
              <div className="mb-[17px] space-y-1">
                <h3 className="font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Dasar</h3>
                <p className="text-[10px] text-[#93a49c]">
                  Identitas utama dan kontak pegawai yang akan disimpan.
                </p>
              </div>

              <input type="hidden" name="photo_url" value={photoUrl ?? ""} />

              {/* Foto pegawai */}
              <div className="space-y-2">
                <FieldLabel htmlFor="photo" optional>Foto</FieldLabel>
                <div className="flex items-start gap-4">
                  <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-[14px] border border-dashed border-[#cfe6d4] bg-[#f6fbf7] text-[#9bbfa5]">
                    {photoUrl ? (
                      <Avatar className="size-20 shrink-0">
                        <AvatarImage src={photoUrl} alt={editing?.full_name ?? "Pegawai"} />
                        <AvatarFallback className="rounded-[14px] bg-[#def1e2] text-[#2b7254]">
                          {editing?.full_name ? getInitials(editing.full_name) : <UserIcon className="size-7" />}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <ImagePlusIcon className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2b493e]">Foto Pegawai</p>
                    <p className="mt-1 text-[10px] text-[#93a49c]">
                      {photoName ? `Dipilih: ${photoName}. ` : ""}JPG/PNG/WebP maksimal 2 MB.
                    </p>
                    <input
                      ref={photoInputRef}
                      id="photo"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 h-8 w-full rounded-[9px] border-[#d7e6dc] bg-white text-[10px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      Upload Foto
                    </Button>
                    {isUploading && <p className="mt-1 text-xs text-[#4b8669]">Mengunggah...</p>}
                    {uploadError ? <p className="mt-1 text-xs text-destructive">{uploadError}</p> : null}
                  </div>
                </div>
                {photoUrl && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => {
                        setPhotoUrl(null);
                        setPhotoName(null);
                        setUploadError(null);
                      }}
                      aria-label="Hapus foto"
                    >
                      <XIcon className="size-4 text-[#83988e]" />
                    </Button>
                    <span className="text-xs text-[#83988e]">Foto saat ini terpasang. Klik untuk ganti.</span>
                  </div>
                )}
              </div>

              <div className="grid items-start gap-4 sm:grid-cols-2">
                {/* Nama Lengkap (kiri atas foto, sampai dengan kolom NIP) */}
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="full_name" required>
                    Nama Lengkap
                  </FieldLabel>
                  <Input
                    id="full_name"
                    name="full_name"
                    defaultValue={editing?.full_name ?? ""}
                    placeholder="Contoh: Ahmad Fauzi, S.Pd"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="nip" optional>
                    NIP
                  </FieldLabel>
                  <Input
                    id="nip"
                    name="nip"
                    defaultValue={editing?.nip ?? ""}
                    placeholder="Nomor Induk Pegawai"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="niy" optional>
                    NIY
                  </FieldLabel>
                  <Input id="niy" name="niy" defaultValue={editing?.niy ?? ""} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="nuptk" optional>
                    NUPTK
                  </FieldLabel>
                  <Input id="nuptk" name="nuptk" defaultValue={editing?.nuptk ?? ""} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="jenis_kelamin" optional>
                    Jenis Kelamin
                  </FieldLabel>
                  <select
                    id="jenis_kelamin"
                    name="jenis_kelamin"
                    defaultValue={editing?.jenis_kelamin ?? ""}
                    className={selectClass}
                  >
                    <option value="">- tidak diisi -</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="tempat_lahir" optional>
                    Tempat Lahir
                  </FieldLabel>
                  <Input
                    id="tempat_lahir"
                    name="tempat_lahir"
                    defaultValue={editing?.tempat_lahir ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="tanggal_lahir" optional>
                    Tanggal Lahir
                  </FieldLabel>
                  <Input
                    id="tanggal_lahir"
                    name="tanggal_lahir"
                    type="date"
                    defaultValue={editing?.tanggal_lahir ?? ""}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="agama_id" optional>
                    Agama
                  </FieldLabel>
                  <select
                    id="agama_id"
                    name="agama_id"
                    defaultValue={editing?.agama_id ?? ""}
                    className={selectClass}
                  >
                    <option value="">- tidak ada -</option>
                    {options.agama.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama_agama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-[13px] my-[21px] text-[10px] font-bold uppercase tracking-[.04em] text-[#a8b8b1]">
                <div className="h-px flex-1 bg-[#e3ece6]" />
                <span className="px-0.5">Kontak</span>
                <div className="h-px flex-1 bg-[#e3ece6]" />
              </div>

              <div className="grid gap-[17px_19px] sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="phone" optional>
                    Telepon
                  </FieldLabel>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editing?.phone ?? ""}
                    placeholder="08xx"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="email" optional>
                    Email
                  </FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editing?.email ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <FieldLabel htmlFor="alamat" optional>
                    Alamat
                  </FieldLabel>
                  <Input id="alamat" name="alamat" defaultValue={editing?.alamat ?? ""} />
                </div>
              </div>
            </TabsContent>

            {/* ===== Tab 2: Informasi Kepegawaian ===== */}
            <TabsContent value="employment" keepMounted className="space-y-4 pt-4">
              <div className="space-y-1">
                <h3 className="font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Kepegawaian</h3>
                <p className="mt-[5px] text-[10px] text-[#93a49c]">
                  Atur status, jabatan, dan unit kerja pegawai.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="status_kepegawaian_id" optional>
                    Status Kepegawaian
                  </FieldLabel>
                  <select
                    id="status_kepegawaian_id"
                    name="status_kepegawaian_id"
                    defaultValue={editing?.status_kepegawaian_id ?? ""}
                    className={selectClass}
                  >
                    <option value="">- tidak ada -</option>
                    {options.status_kepegawaian.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama_status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <FieldLabel optional>Jabatan (boleh lebih dari satu)</FieldLabel>
                  <MultiSelect
                    options={jabatanOptions}
                    selected={selectedJabatanIds}
                    onChange={setSelectedJabatanIds}
                    placeholder="Pilih jabatan..."
                    emptyText="Belum ada jabatan. Tambahkan lewat menu Master Data."
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="jabatan_utama_id" optional>
                    Jabatan Utama
                  </FieldLabel>
                  <select
                    id="jabatan_utama_id"
                    name="jabatan_utama_id"
                    defaultValue={
                      jabatanTerpilih.find((info) => info.is_utama)?.jabatan_id ?? ""
                    }
                    key={selectedJabatanIds.join(",")}
                    className={selectClass}
                  >
                    <option value="">- pilih jabatan utama -</option>
                    {options.jabatan
                      .filter((jabatan) => selectedJabatanIds.includes(jabatan.id))
                      .map((jabatan) => (
                        <option key={jabatan.id} value={jabatan.id}>
                          {jabatan.nama_jabatan}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="golongan_id" optional>
                    Golongan
                  </FieldLabel>
                  <select
                    id="golongan_id"
                    name="golongan_id"
                    defaultValue={editing?.golongan_id ?? ""}
                    className={selectClass}
                  >
                    <option value="">- tidak ada -</option>
                    {options.golongan.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.kode_golongan}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="unit_kerja_id" optional>
                    Unit Kerja
                  </FieldLabel>
                  <select
                    id="unit_kerja_id"
                    name="unit_kerja_id"
                    defaultValue={editing?.unit_kerja_id ?? ""}
                    className={selectClass}
                  >
                    <option value="">- tidak ada -</option>
                    {options.unit_kerja.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nama_unit}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="tahun_masuk" optional>
                    Tahun Masuk
                  </FieldLabel>
                  <Input
                    id="tahun_masuk"
                    name="tahun_masuk"
                    type="date"
                    defaultValue={editing?.tahun_masuk ?? ""}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2.5 self-end pb-2">
                  <Checkbox
                    id="is_active_checkbox"
                    checked={isActive}
                    onCheckedChange={(checked) => setIsActive(Boolean(checked))}
                  />
                  <Label htmlFor="is_active_checkbox" className="cursor-pointer">
                    Pegawai aktif
                  </Label>
                </div>
              </div>
            </TabsContent>

            {/* ===== Tab 3: Riwayat Pendidikan (multi-baris) ===== */}
            <TabsContent value="education" keepMounted className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Riwayat Pendidikan</h3>
                  <p className="mt-[5px] text-[10px] text-[#93a49c]">
                    Tambahkan riwayat pendidikan formal pegawai. Anda bisa menambahkan lebih dari satu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPendidikanRows((prev) => [...prev, emptyPendidikanRow()])}
                  className="h-8 rounded-[9px] border-[#d7e6dc] bg-white px-3 text-[10px] font-bold text-[#4b8669] shadow-none hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
                >
                  <PlusIcon data-icon="inline-start" />
                  Tambah Pendidikan
                </Button>
              </div>
              {pendidikanRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                  Belum ada riwayat pendidikan (semua kolom opsional).
                </p>
              ) : (
                pendidikanRows.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`pendidikan_jenjang_${index}`} optional>
                        Jenjang
                      </FieldLabel>
                      <select
                        id={`pendidikan_jenjang_${index}`}
                        value={row.jenjang_pendidikan_id}
                        onChange={(event) =>
                          updatePendidikanRow(index, { jenjang_pendidikan_id: event.target.value })
                        }
                        className={selectClass}
                      >
                        <option value="">- tidak ada -</option>
                        {options.jenjang_pendidikan.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nama_jenjang}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`pendidikan_jurusan_${index}`} optional>
                        Jurusan
                      </FieldLabel>
                      <Input
                        id={`pendidikan_jurusan_${index}`}
                        value={row.jurusan}
                        onChange={(event) =>
                          updatePendidikanRow(index, { jurusan: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`pendidikan_institusi_${index}`} optional>
                        Nama Institusi
                      </FieldLabel>
                      <Input
                        id={`pendidikan_institusi_${index}`}
                        value={row.nama_institusi}
                        onChange={(event) =>
                          updatePendidikanRow(index, { nama_institusi: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="w-full space-y-2">
                        <FieldLabel htmlFor={`pendidikan_tahun_${index}`} optional>
                          Tahun Lulus
                        </FieldLabel>
                        <Input
                          id={`pendidikan_tahun_${index}`}
                          value={row.tahun_lulus}
                          onChange={(event) =>
                            updatePendidikanRow(index, { tahun_lulus: event.target.value })
                          }
                          placeholder="Contoh: 2020"
                          className={inputClass}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Hapus baris pendidikan"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() =>
                          setPendidikanRows((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {/* ===== Tab 4: Sertifikasi (multi-baris) ===== */}
            <TabsContent value="certification" keepMounted className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Sertifikasi</h3>
                  <p className="mt-[5px] text-[10px] text-[#93a49c]">
                    Tambahkan sertifikasi atau pelatihan profesional pegawai.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSertifikasiRows((prev) => [...prev, emptySertifikasiRow()])}
                  className="h-8 rounded-[9px] border-[#d7e6dc] bg-white px-3 text-[10px] font-bold text-[#4b8669] shadow-none hover:border-[#9bc5a8] hover:bg-[#f4faf5] hover:text-[#4b8669]"
                >
                  <PlusIcon data-icon="inline-start" />
                  Tambah Sertifikasi
                </Button>
              </div>
              {sertifikasiRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center border rounded-lg border-dashed">
                  Belum ada sertifikasi.
                </p>
              ) : (
                sertifikasiRows.map((row, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`sertifikasi_nama_${index}`} required>
                        Nama Sertifikasi
                      </FieldLabel>
                      <Input
                        id={`sertifikasi_nama_${index}`}
                        value={row.nama_sertifikasi}
                        onChange={(event) =>
                          updateSertifikasiRow(index, { nama_sertifikasi: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`sertifikasi_nomor_${index}`} optional>
                        Nomor Sertifikat
                      </FieldLabel>
                      <Input
                        id={`sertifikasi_nomor_${index}`}
                        value={row.nomor_sertifikat}
                        onChange={(event) =>
                          updateSertifikasiRow(index, { nomor_sertifikat: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`sertifikasi_berlaku_${index}`} optional>
                        Tanggal Berlaku
                      </FieldLabel>
                      <Input
                        id={`sertifikasi_berlaku_${index}`}
                        type="date"
                        value={row.tanggal_berlaku}
                        onChange={(event) =>
                          updateSertifikasiRow(index, { tanggal_berlaku: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <FieldLabel htmlFor={`sertifikasi_kedaluwarsa_${index}`} optional>
                        Tanggal Kedaluwarsa
                      </FieldLabel>
                      <Input
                        id={`sertifikasi_kedaluwarsa_${index}`}
                        type="date"
                        value={row.tanggal_kedaluwarsa}
                        onChange={(event) =>
                          updateSertifikasiRow(index, { tanggal_kedaluwarsa: event.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="flex items-end gap-2 sm:col-span-2">
                      <div className="w-full space-y-2">
                        <FieldLabel htmlFor={`sertifikasi_penerbit_${index}`} optional>
                          Penerbit
                        </FieldLabel>
                        <Input
                          id={`sertifikasi_penerbit_${index}`}
                          value={row.penerbit}
                          onChange={(event) =>
                            updateSertifikasiRow(index, { penerbit: event.target.value })
                          }
                          className={inputClass}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Hapus baris sertifikasi"
                        className="text-destructive hover:text-destructive shrink-0"
                        onClick={() =>
                          setSertifikasiRows((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
          </div>

          <DialogFooter className="mx-0 mb-0 justify-between gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-[#96a9a0]">
              <ShieldCheck className="size-[15px] text-[#5a9a74]" /> Data dapat dilengkapi kembali nanti
            </span>
            <div className="flex gap-2">
              {!isFirstTab ? (
                <Button
                  type="button"
                  onClick={goToPrevTab}
                  className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                >
                  <ArrowLeftIcon data-icon="inline-start" className="size-3.5" />
                  Sebelumnya
                </Button>
              ) : null}
              {!isLastTab ? (
                <Button
                  type="button"
                  onClick={goToNextTab}
                  className="h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                >
                  Selanjutnya
                  <ArrowRightIcon data-icon="inline-end" className="size-3.5" />
                </Button>
              ) : null}
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
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan pegawai"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
