"use client";

import { Fragment, useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
   ChevronUpIcon,
  Columns3Icon,
  FilterIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StudentEnrollment, AcademicYear, Class as SchoolClass, Siswa } from "@/lib/types";
import { fetchAvailableStudents, saveEnrollment, deleteEnrollment, saveBulkEnrollment } from "../actions";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type FormState = { error?: string; success?: string } | undefined;

type ColumnKey = "student" | "class" | "year" | "enrollment_date" | "exit_date" | "status";

const allColumns: { key: ColumnKey; label: string }[] = [
  { key: "student", label: "Nama Siswa" },
  { key: "class", label: "Kelas" },
  { key: "year", label: "Tahun Ajaran" },
  { key: "enrollment_date", label: "Tanggal Daftar" },
  { key: "exit_date", label: "Tanggal Keluar" },
  { key: "status", label: "Status" },
];

const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

const SCROLLBAR_HIDDEN_STYLE = { scrollbarWidth: "none" } as const;

const STATUS_LABELS: Record<StudentEnrollment["status"], string> = {
  active: "Aktif",
  keluar: "Keluar",
  pindah: "Pindah",
  lulus: "Lulus",
};

const STATUS_COLORS: Record<StudentEnrollment["status"], string> = {
  active: "bg-[#e7f5e9] text-[#2b7254]",
  keluar: "bg-[#fdf0ee] text-[#ad685d]",
  pindah: "bg-[#fcf3e3] text-[#a67437]",
  lulus: "bg-[#e8f0fa] text-[#2f6db3]",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function PendaftaranClient({
  enrollments,
  academicYears,
  classes,
  students,
  classByStudentId,
  canManage,
}: {
  enrollments: StudentEnrollment[];
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  students: Siswa[];
  classByStudentId: Record<string, string>;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentEnrollment | null>(null);
  const [viewing, setViewing] = useState<StudentEnrollment | null>(null);
  const [deleting, setDeleting] = useState<StudentEnrollment | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(allColumns.map((col) => col.key))
  );
  const [sortColumn, setSortColumn] = useState<ColumnKey>("enrollment_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterYear, setFilterYear] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const bulkForm = useForm<{
    academic_year_id: string;
    class_id: string;
    enrollment_date: string;
    exit_date: string;
    status: "active" | "keluar" | "pindah" | "lulus";
    siswa_ids: string[];
  }>({
    defaultValues: {
      academic_year_id: "",
      class_id: "",
      enrollment_date: new Date().toISOString().slice(0, 10),
      exit_date: "",
      status: "active",
      siswa_ids: [],
    },
  });

  const watchedYear = bulkForm.watch("academic_year_id");

  const activeYears = useMemo(
    () => academicYears.filter((y) => y.status === "active"),
    [academicYears]
  );

  useEffect(() => {
    const year = activeYears.find((y) => y.id === watchedYear);
    if (year) {
      bulkForm.setValue("enrollment_date", year.start_date.slice(0, 10));
    }
  }, [watchedYear, activeYears, bulkForm]);

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s.nama_lengkap])),
    [students]
  );
  const classById = useMemo(
    () => new Map(classes.map((c) => [c.id, c.name])),
    [classes]
  );
  const yearById = useMemo(
    () => new Map(academicYears.map((y) => [y.id, y.name])),
    [academicYears]
  );

  const studentName = useMemo(
    () => (id: string): string => studentById.get(id) ?? id,
    [studentById]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enrollments.filter((e) => {
      if (filterYear && e.academic_year_id !== filterYear) return false;
      if (filterClass && e.class_id !== filterClass) return false;
      if (filterStatus && e.status !== filterStatus) return false;
      if (!q) return true;
      const searchable = [
        studentName(e.student_id),
        classById.get(e.class_id) ?? "",
        yearById.get(e.academic_year_id) ?? "",
        STATUS_LABELS[e.status],
      ];
      return searchable.some((val) => val.toLowerCase().includes(q));
    });
  }, [enrollments, query, filterYear, filterClass, filterStatus, studentName, classById, yearById]);

  const sorted = useMemo(() => {
    const getVal = (item: StudentEnrollment): string => {
      switch (sortColumn) {
        case "student":
          return studentName(item.student_id);
        case "class":
          return classById.get(item.class_id) ?? "";
        case "year":
          return yearById.get(item.academic_year_id) ?? "";
        case "enrollment_date":
          return item.enrollment_date;
        case "exit_date":
          return item.exit_date ?? "";
        case "status":
          return STATUS_LABELS[item.status];
      }
    };
    return [...filtered].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      return getVal(a).localeCompare(getVal(b), "id", { numeric: true, sensitivity: "base" }) * dir;
    });
  }, [filtered, sortColumn, sortDirection, studentName, classById, yearById]);

  const yearGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      name: string;
      classes: Map<string, { key: string; name: string; rows: StudentEnrollment[]; enrollment_date: string; exit_date: string | null; status: StudentEnrollment["status"] }>;
    }>();
    for (const item of sorted) {
      let yearGroup = groups.get(item.academic_year_id);
      if (!yearGroup) {
        yearGroup = { key: item.academic_year_id, name: yearById.get(item.academic_year_id) ?? "-", classes: new Map() };
        groups.set(item.academic_year_id, yearGroup);
      }
      let classGroup = yearGroup.classes.get(item.class_id);
      if (!classGroup) {
        classGroup = {
          key: `${item.academic_year_id}::${item.class_id}`,
          name: classById.get(item.class_id) ?? "-",
          rows: [],
          enrollment_date: item.enrollment_date,
          exit_date: item.exit_date ?? null,
          status: item.status,
        };
        yearGroup.classes.set(item.class_id, classGroup);
      }
      classGroup.rows.push(item);
      if (item.enrollment_date < classGroup.enrollment_date) classGroup.enrollment_date = item.enrollment_date;
      if (item.exit_date && (!classGroup.exit_date || item.exit_date > classGroup.exit_date)) classGroup.exit_date = item.exit_date;
      if (item.status === "active") classGroup.status = "active";
      else if (classGroup.status !== "active") classGroup.status = item.status;
    }
    return Array.from(groups.values()).map((year) => ({
      ...year,
      classes: Array.from(year.classes.values()).sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true })),
      studentCount: Array.from(year.classes.values()).reduce((count, group) => count + group.rows.length, 0),
    }));
  }, [sorted, yearById, classById]);

  const safeTotalPages = Math.max(1, Math.ceil(yearGroups.length / pageSize));
  const safePage = Math.min(page, safeTotalPages);
  const rangeStart = yearGroups.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, yearGroups.length);
  const paginatedYearGroups = yearGroups.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleToggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allGroupsExpanded = paginatedYearGroups.length > 0 && paginatedYearGroups.every((g) => expandedGroups[g.key]);

  const toggleAllGroups = () => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const group of paginatedYearGroups) next[group.key] = !allGroupsExpanded;
      return next;
    });
  };

  const visibleColumnList = allColumns.filter((col) => visibleColumns.has(col.key));
  const visibleChildColumns = visibleColumnList.filter((col) => col.key !== "year" && col.key !== "class");

  const activeFilterCount = [filterYear, filterClass, filterStatus].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;

  const studentOptions = useMemo(
    () => students.map((s) => ({ value: s.id, label: s.nama_lengkap })),
    [students]
  );
  const yearOptions = useMemo(
    () => academicYears.map((y) => ({ value: y.id, label: y.name })),
    [academicYears]
  );

  const classOptions = useMemo(
    () => classes.map((c) => ({ value: c.id, label: c.name })),
    [classes]
  );

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

  const openEdit = (item: StudentEnrollment) => {
    setBanner(null);
    setEditing(item);
    setFormOpen(true);
  };

  const openBulk = () => {
    setBanner(null);
    bulkForm.reset({
      academic_year_id: "",
      class_id: "",
      enrollment_date: new Date().toISOString().slice(0, 10),
      exit_date: "",
      status: "active",
      siswa_ids: [],
    });
    setBulkOpen(true);
  };

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", target.id);
      const result = await deleteEnrollment(undefined, formData);
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
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">Pendaftaran Siswa</h1>
          <p className="text-sm text-muted-foreground">
            Daftarkan siswa ke tahun ajaran dan kelas yang sesuai.
          </p>
        </div>
        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]" />
              }
            >
              <PlusIcon data-icon="inline-start" className="size-4" />
              Tambah Pendaftaran
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-[#e2ece5] bg-white">
              <DropdownMenuItem
                className="text-xs text-[#5d7a6e] focus:bg-[#f4faf5]"
                onClick={() => openCreate()}
              >
                Tambah Satuan
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs text-[#5d7a6e] focus:bg-[#f4faf5]"
                onClick={() => openBulk()}
              >
                Pendaftaran Massal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <CardTitle className="font-heading text-[#21483b]">Daftar Pendaftaran</CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {sorted.length} dari {enrollments.length} pendaftaran
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
                placeholder="Cari data pendaftaran..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
              {isSearchFocused ? (
                <div className="absolute top-[calc(100%+6px)] left-0 z-40 w-full rounded-[10px] border border-[#dbe8df] bg-white p-3.5 shadow-[0_12px_32px_rgb(13_50_35/14%)]">
                  <p className="text-[10px] font-bold tracking-[.06em] text-[#4d9775] uppercase">
                    Pencarian mencakup
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                      Nama Siswa
                    </span>
                    <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                      Kelas
                    </span>
                    <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                      Tahun Ajaran
                    </span>
                    <span className="rounded-[6px] bg-[#eef6f0] px-2 py-[3px] text-[10px] font-semibold text-[#4b8669]">
                      Status
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
                {activeFilterCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-[#d06a5d] text-[9px] font-bold text-white">
                    {activeFilterCount}
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
                  Filter Data Pendaftaran
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
                    setFilterYear("");
                    setFilterClass("");
                    setFilterStatus("");
                    setPage(1);
                  }}
                  className="h-7 gap-1.5 rounded-[8px] px-2.5 text-[10px] font-bold text-[#ad685d] hover:bg-[#fdf0ee] hover:text-[#ad685d]"
                >
                  <XIcon className="size-3.5" />
                  Hapus semua filter
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">Tahun Ajaran</label>
                <select
                  value={filterYear}
                  onChange={(event) => {
                    setFilterYear(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">Kelas</label>
                <select
                  value={filterClass}
                  onChange={(event) => {
                    setFilterClass(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#4c6a5e]">Status</label>
                <select
                  value={filterStatus}
                  onChange={(event) => {
                    setFilterStatus(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none focus:border-[#78ad8a]"
                >
                  <option value="">Semua</option>
                  <option value="active">Aktif</option>
                  <option value="keluar">Keluar</option>
                  <option value="pindah">Pindah</option>
                  <option value="lulus">Lulus</option>
                </select>
              </div>
            </div>
          </div>
        ) : null}
        <CardContent className="px-0">
          <div className="overflow-x-auto" style={SCROLLBAR_HIDDEN_STYLE}>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                  <TableHead className="px-4 py-2.5 text-[10px] font-bold text-[#6c8279]">Tahun Ajaran</TableHead>
                  <TableHead className="px-4 py-2.5 text-right text-[10px] font-bold text-[#6c8279]">Total Siswa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedYearGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-32 border-b border-[#f0f5f1] px-3.5 py-3 text-center text-xs text-[#a0afa8]">
                      {query || hasActiveFilters ? "Tidak ada pendaftaran yang cocok dengan pencarian atau filter." : "Belum ada pendaftaran siswa."}
                    </TableCell>
                  </TableRow>
                ) : paginatedYearGroups.map((yearGroup) => {
                  const yearExpanded = Boolean(expandedGroups[yearGroup.key]);
                  return (
                    <Fragment key={yearGroup.key}>
                      <TableRow className="border-b border-[#e5eee8] bg-[#f7fbf8] hover:bg-[#f0f7f2]">
                        <TableCell colSpan={3} className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              aria-label={yearExpanded ? "Ciutkan tahun ajaran" : "Luaskan tahun ajaran"}
                              aria-expanded={yearExpanded}
                              onClick={() => handleToggleGroup(yearGroup.key)}
                              className="flex size-9 shrink-0 items-center justify-center rounded-[8px] border border-[#8eb1c9] bg-white text-[#487a98] transition-colors hover:border-[#4c87ac] hover:bg-[#edf6fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c87ac]"
                            >
                              {yearExpanded ? <ChevronDownIcon className="size-4" /> : <ChevronUpIcon className="size-4" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#294a3e]">{yearGroup.name}</p>
                              <p className="mt-0.5 text-[10px] text-[#82978e]">{yearGroup.classes.length} kelas</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold tabular-nums text-[#315e4b]">{yearGroup.studentCount}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                      {yearExpanded ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="p-0">
                            <div className="border-y border-[#e7eee9] bg-white px-4 py-3 pl-8">
                              <div className="overflow-x-auto rounded-[9px] border border-[#e3ebe6]">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-b border-[#e5eee8] bg-[#fbfdfb] hover:bg-[#fbfdfb]">
                                      <TableHead className="w-12 px-3 py-2.5" />
                                      <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">Kelas</TableHead>
                                      <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">Tanggal Pendaftaran</TableHead>
                                      <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">Tanggal Keluar</TableHead>
                                      <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">Status</TableHead>
                                      <TableHead className="px-3 py-2.5 text-right text-[10px] font-bold text-[#6c8279]">Aksi</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {yearGroup.classes.map((classGroup) => {
                                      const classExpanded = Boolean(expandedGroups[classGroup.key]);
                                      const genderLabel = (value: string | null | undefined) => value === "L" ? "Laki-laki" : value === "P" ? "Perempuan" : "-";
                                      return (
                                        <Fragment key={classGroup.key}>
                                          <TableRow className="border-b border-[#f0f5f1] hover:bg-[#f6fbf7]">
                                            <TableCell className="px-3 py-2.5">
                                              <button
                                                type="button"
                                                aria-label={classExpanded ? `Ciutkan kelas ${classGroup.name}` : `Luaskan kelas ${classGroup.name}`}
                                                aria-expanded={classExpanded}
                                                onClick={() => handleToggleGroup(classGroup.key)}
                                                className="flex size-8 items-center justify-center rounded-[7px] border border-[#dce8e0] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4c87ac]"
                                              >
                                                {classExpanded ? <ChevronDownIcon className="size-3.5" /> : <ChevronUpIcon className="size-3.5" />}
                                              </button>
                                            </TableCell>
                                            <TableCell className="px-3 py-2.5 text-xs font-semibold text-[#2b493e]">{classGroup.name}</TableCell>
                                            <TableCell className="px-3 py-2.5 text-xs whitespace-nowrap text-[#3e5c50]">{formatDate(classGroup.enrollment_date) || "-"}</TableCell>
                                            <TableCell className="px-3 py-2.5 text-xs whitespace-nowrap text-[#3e5c50]">{classGroup.exit_date ? formatDate(classGroup.exit_date) : "-"}</TableCell>
                                            <TableCell className="px-3 py-2.5"><Badge className={`rounded-[5px] border-transparent px-2 py-1 text-[9px] font-bold ${STATUS_COLORS[classGroup.status]}`}>{STATUS_LABELS[classGroup.status]}</Badge></TableCell>
                                            <TableCell className="px-3 py-2.5">
                                              {canManage ? (
                                                <div className="flex justify-end gap-1.5">
                                                  <Button variant="ghost" size="icon-sm" aria-label={`Ubah pendaftaran kelas ${classGroup.name}`} className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]" onClick={() => openEdit(classGroup.rows[0])}><PencilIcon className="size-4" /></Button>
                                                  <Button variant="ghost" size="icon-sm" aria-label={`Hapus pendaftaran kelas ${classGroup.name}`} className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]" onClick={() => setDeleting(classGroup.rows[0])}><Trash2Icon className="size-4" /></Button>
                                                </div>
                                              ) : <span className="block text-right text-[10px] text-[#82978e]">{classGroup.rows.length} siswa</span>}
                                            </TableCell>
                                          </TableRow>
                                          {classExpanded ? (
                                            <TableRow className="hover:bg-transparent">
                                              <TableCell colSpan={6} className="bg-[#fbfcfb] px-5 py-3 pl-12">
                                                <div className="overflow-x-auto rounded-[8px] border border-[#dfe7e2] bg-white">
                                                  <Table>
                                                    <TableHeader>
                                                      <TableRow className="border-b border-[#e7eee9] bg-[#f8fbf9] hover:bg-[#f8fbf9]">
                                                        <TableHead className="w-12 px-3 py-2 text-right text-[10px] font-bold text-[#6c8279]">No</TableHead>
                                                        <TableHead className="px-3 py-2 text-[10px] font-bold text-[#6c8279]">NIS</TableHead>
                                                        <TableHead className="px-3 py-2 text-[10px] font-bold text-[#6c8279]">Nama Siswa</TableHead>
                                                        <TableHead className="px-3 py-2 text-[10px] font-bold text-[#6c8279]">Jenis Kelamin</TableHead>
                                                      </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                      {classGroup.rows.map((item, index) => {
                                                        const student = students.find((entry) => entry.id === item.student_id);
                                                        return (
                                                          <TableRow key={item.id} className="cursor-pointer border-b border-[#f0f5f1] last:border-0 hover:bg-[#f6fbf7]" onClick={() => setViewing(item)}>
                                                            <TableCell className="px-3 py-2.5 text-right text-xs tabular-nums text-[#82978e]">{index + 1}</TableCell>
                                                            <TableCell className="px-3 py-2.5 text-xs text-[#3e5c50]">{student?.nis ?? "-"}</TableCell>
                                                            <TableCell className="px-3 py-2.5 text-xs font-medium text-[#2b493e]">{studentName(item.student_id)}</TableCell>
                                                            <TableCell className="px-3 py-2.5 text-xs text-[#3e5c50]">{genderLabel(student?.jenis_kelamin)}</TableCell>
                                                          </TableRow>
                                                        );
                                                      })}
                                                    </TableBody>
                                                  </Table>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ) : null}
                                        </Fragment>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f5f1] px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#8b9f95]">
                  Menampilkan {rangeStart}–{rangeEnd} dari {yearGroups.length} tahun ajaran ({yearGroups.reduce((total, group) => total + group.studentCount, 0)} siswa)
                </span>
                <div className="flex items-center gap-1.5">
                  <label htmlFor="pendaftaran-page-size" className="text-[10px] font-bold text-[#6c8279]">
                    Baris
                  </label>
                  <select
                    id="pendaftaran-page-size"
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
        pendaftaran={viewing}
        studentName={studentName}
        classById={classById}
        yearById={yearById}
        onClose={() => setViewing(null)}
      />

      {canManage ? (
        <>
          <FormDialog
            key={editing?.id ?? "new"}
            open={formOpen}
            onOpenChange={setFormOpen}
            editing={editing}
            studentOptions={studentOptions}
            yearOptions={yearOptions}
            classOptions={classOptions}
            onSaved={(message) => {
              setBanner(message);
              setFormOpen(false);
            }}
          />

          <BulkEnrollmentDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            academicYears={activeYears}
            classOptions={classOptions}
            students={students}
            onReset={() => {
              setExpandedGroups({});
            }}
            onSaved={(message) => {
              setBanner(message);
              setBulkOpen(false);
            }}
          />

          <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus pendaftaran ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleting
                    ? `Pendaftaran ${studentName(deleting.student_id)} akan dihapus permanen.`
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
  pendaftaran,
  studentName,
  classById,
  yearById,
  onClose,
}: {
  pendaftaran: StudentEnrollment | null;
  studentName: (id: string) => string;
  classById: Map<string, string>;
  yearById: Map<string, string>;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(pendaftaran)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(92vh,900px)] flex-col gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[600px] rounded-[17px] bg-[#fbfdfb] p-0 shadow-[0_24px_70px_rgb(13_50_35/22%)]">
        <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
            Data akademik
          </span>
          <DialogTitle
            className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Detail Pendaftaran
          </DialogTitle>
          <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
            Ringkasan informasi pendaftaran siswa.
          </DialogDescription>
        </DialogHeader>
        {pendaftaran ? (
          <div
            className="flex-1 overflow-y-auto px-7 pt-[22px] pb-[25px]"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="min-w-0">
              <p
                className="truncate text-sm font-bold text-[#2b493e]"
                title={studentName(pendaftaran.student_id)}
              >
                {studentName(pendaftaran.student_id)}
              </p>
            </div>
            <h3 className="mt-6 font-heading text-[14px] tracking-[-.03em] text-[#24483b]">Informasi Pendaftaran</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <DetailRow label="Nama Siswa" value={studentName(pendaftaran.student_id)} />
              <DetailRow label="Kelas" value={classById.get(pendaftaran.class_id)} />
              <DetailRow label="Tahun Ajaran" value={yearById.get(pendaftaran.academic_year_id)} />
              <DetailRow label="Tanggal Daftar" value={formatDate(pendaftaran.enrollment_date)} />
              <DetailRow label="Tanggal Keluar" value={pendaftaran.exit_date ? formatDate(pendaftaran.exit_date) : null} />
              <DetailRow label="Status" value={STATUS_LABELS[pendaftaran.status]} />
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
  studentOptions,
  yearOptions,
  classOptions,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StudentEnrollment | null;
  studentOptions: { value: string; label: string }[];
  yearOptions: { value: string; label: string }[];
  classOptions: { value: string; label: string }[];
  onSaved: (message: string) => void;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveEnrollment, undefined);

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
              {isEdit ? "Ubah Pendaftaran" : "Tambah Pendaftaran"}
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              {editing
                ? "Perbarui data pendaftaran siswa."
                : "Tambahkan siswa ke kelas dan tahun ajaran."}
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <div
            className="flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={SCROLLBAR_HIDDEN_STYLE}
          >
            <div className="space-y-2">
              <FieldLabel htmlFor="student_id" required>
                Siswa
              </FieldLabel>
              <select
                id="student_id"
                name="student_id"
                defaultValue={editing?.student_id ?? ""}
                className={SELECT_CLASS}
                required
              >
                <option value="">- pilih siswa -</option>
                {studentOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
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
                className={SELECT_CLASS}
                required
              >
                <option value="">- pilih tahun ajaran -</option>
                {yearOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="class_id" required>
                Kelas
              </FieldLabel>
              <select
                id="class_id"
                name="class_id"
                defaultValue={editing?.class_id ?? ""}
                className={SELECT_CLASS}
                required
              >
                <option value="">- pilih kelas -</option>
                {classOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="enrollment_date" required>
                  Tanggal Pendaftaran
                </FieldLabel>
                <Input
                  id="enrollment_date"
                  name="enrollment_date"
                  type="date"
                  defaultValue={editing?.enrollment_date?.slice(0, 10) ?? ""}
                  required={!isEdit}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="exit_date" optional>
                  Tanggal Keluar
                </FieldLabel>
                <Input
                  id="exit_date"
                  name="exit_date"
                  type="date"
                  defaultValue={editing?.exit_date?.slice(0, 10) ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <FieldLabel htmlFor="status" required>
                Status
              </FieldLabel>
              <select
                id="status"
                name="status"
                defaultValue={editing?.status ?? "active"}
                className={SELECT_CLASS}
                required
              >
                <option value="active">Aktif</option>
                <option value="keluar">Keluar</option>
                <option value="pindah">Pindah</option>
                <option value="lulus">Lulus</option>
              </select>
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
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan Pendaftaran"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== Bulk Enrollment Dialog =====

function BulkEnrollmentDialog({
  open,
  onOpenChange,
  academicYears,
  classOptions,
  students,
  onReset,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  academicYears: AcademicYear[];
  classOptions: { value: string; label: string }[];
  students: Siswa[];
  onReset: () => void;
  onSaved: (message: string) => void;
}) {
  const bulkForm = useForm<{
    academic_year_id: string;
    class_id: string;
    enrollment_date: string;
    exit_date: string;
    status: "active" | "keluar" | "pindah" | "lulus";
    siswa_ids: string[];
  }>({
    defaultValues: {
      academic_year_id: "",
      class_id: "",
      enrollment_date: new Date().toISOString().slice(0, 10),
      exit_date: "",
      status: "active",
      siswa_ids: [],
    },
  });

  const watchedYear = bulkForm.watch("academic_year_id");
  const selectedYear = academicYears.find((year) => year.id === watchedYear);
  const [availableStudents, setAvailableStudents] = useState<Siswa[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  useEffect(() => {
    let active = true;
    bulkForm.setValue("siswa_ids", []);
    if (!watchedYear) {
      setAvailableStudents([]);
      return () => {
        active = false;
      };
    }
    setIsLoadingStudents(true);
    void fetchAvailableStudents(watchedYear).then((result) => {
      if (!active) return;
      if (!result.ok) {
        toast.error(result.error);
        setAvailableStudents([]);
      } else {
        setAvailableStudents(result.data as Siswa[]);
      }
      setIsLoadingStudents(false);
    });
    return () => {
      active = false;
    };
  }, [watchedYear, bulkForm]);

  useEffect(() => {
    if (selectedYear) {
      bulkForm.setValue("enrollment_date", selectedYear.start_date.slice(0, 10));
      bulkForm.setValue("exit_date", selectedYear.end_date.slice(0, 10));
    }
  }, [selectedYear, bulkForm]);

  const availableStudentOptions = useMemo(
    () => availableStudents.map((student) => ({ value: student.id, label: student.nama_lengkap })),
    [availableStudents]
  );

  function formatDateShort(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  }

  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(saveBulkEnrollment, undefined);
  const handledState = useRef<FormState>(undefined);

  useEffect(() => {
    if (!state || state === handledState.current) return;
    handledState.current = state;
    if (state.success) {
      toast.success(state.success);
      onSaved(state.success);
      onReset();
      bulkForm.reset();
      onOpenChange(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, onSaved, onReset, onOpenChange, bulkForm]);

  const selectedIds = bulkForm.watch("siswa_ids");
  const allSelected = selectedIds.length === availableStudentOptions.length && availableStudentOptions.length > 0;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < availableStudentOptions.length;
  void isIndeterminate;

  function handleToggleAll(checked: boolean) {
    bulkForm.setValue(
      "siswa_ids",
      checked ? availableStudentOptions.map((opt) => opt.value) : []
    );
  }

  function handleToggleOne(value: string, checked: boolean) {
    const current = bulkForm.getValues("siswa_ids");
    bulkForm.setValue(
      "siswa_ids",
      checked ? [...current, value] : current.filter((id) => id !== value)
    );
  }

  const handleSubmit = bulkForm.handleSubmit((data) => {
    const formData = new FormData();
    formData.append("academic_year_id", data.academic_year_id);
    formData.append("class_id", data.class_id);
    formData.append("enrollment_date", data.enrollment_date);
    formData.append("exit_date", data.exit_date);
    formData.append("status", data.status);
    data.siswa_ids.forEach((id) => formData.append("siswa_ids", id));
    formAction(formData);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92vh,900px)] gap-0 overflow-hidden border-0 ring-1 ring-[#dbe8df] sm:max-w-[680px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form onSubmit={handleSubmit} className="flex h-full max-h-[min(92vh,900px)] flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6">
            <span className="mb-2 block text-[10px] font-bold tracking-[.1em] text-[#4d9775] uppercase">
              Data akademik
            </span>
            <DialogTitle
              className="text-[23px] font-semibold tracking-[-.055em] text-[#183d32]"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Pendaftaran Massal
            </DialogTitle>
            <DialogDescription className="mt-[7px] text-[11px] text-[#83988e]">
              Pilih siswa dan tetapkan metadata pendaftaran.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-7 pt-[22px] pb-[25px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={SCROLLBAR_HIDDEN_STYLE}>
            {/* Metadata */}
            <div className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="bulk-year" required>
                  Tahun Ajaran
                </FieldLabel>
                <Select
                  value={bulkForm.watch("academic_year_id")}
                   onValueChange={(value) => bulkForm.setValue("academic_year_id", value ?? "")}
                >
                  <SelectTrigger id="bulk-year" className={SELECT_CLASS}>
                     <SelectValue placeholder="- pilih tahun ajaran -">
                       {selectedYear?.name ?? "- pilih tahun ajaran -"}
                     </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {academicYears.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {selectedYear ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[9px] border border-[#e2ece5] bg-[#f7fbf8] px-3 py-2">
                    <p className="text-[10px] font-bold text-[#8b9f95]">Tanggal Mulai</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#4d9775]">
                      {formatDateShort(selectedYear.start_date)}
                    </p>
                  </div>
                  <div className="rounded-[9px] border border-[#e2ece5] bg-[#f7fbf8] px-3 py-2">
                    <p className="text-[10px] font-bold text-[#8b9f95]">Tanggal Akhir</p>
                    <p className="mt-1 text-[11px] font-semibold text-[#4d9775]">
                      {formatDateShort(selectedYear.end_date)}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <FieldLabel htmlFor="bulk-class" required>
                  Kelas
                </FieldLabel>
                <select
                  id="bulk-class"
                  value={bulkForm.watch("class_id")}
                  onChange={(e) => bulkForm.setValue("class_id", e.target.value)}
                  className={SELECT_CLASS}
                  required
                >
                  <option value="">- pilih kelas -</option>
                  {classOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="bulk-enrollment-date" required>
                    Tanggal Pendaftaran
                  </FieldLabel>
                  <Input
                    id="bulk-enrollment-date"
                    type="date"
                    {...bulkForm.register("enrollment_date")}
                    className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-sm text-[#36584a] outline-none focus:border-[#78ad8a]"
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="bulk-exit-date" optional>
                    Tanggal Keluar
                  </FieldLabel>
                  <Input
                    id="bulk-exit-date"
                    type="date"
                    {...bulkForm.register("exit_date")}
                    className="h-10 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-sm text-[#36584a] outline-none focus:border-[#78ad8a]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="bulk-status" required>
                  Status
                </FieldLabel>
                <select
                  id="bulk-status"
                  value={bulkForm.watch("status")}
                  onChange={(e) => bulkForm.setValue("status", e.target.value as "active" | "keluar" | "pindah" | "lulus")}
                  className={SELECT_CLASS}
                >
                  <option value="active">Aktif</option>
                  <option value="keluar">Keluar</option>
                  <option value="pindah">Pindah</option>
                  <option value="lulus">Lulus</option>
                </select>
              </div>
            </div>

            {/* Student multi-select table */}
            {selectedYear ? (
              <div>
                <p className="mb-2 text-[10px] font-bold tracking-[.06em] uppercase text-[#4c9a77]">
                  Pilih Siswa ({selectedIds.length} terpilih)
                </p>
                <div className="overflow-hidden rounded-[10px] border border-[#e2ece5]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                        <TableHead className="w-10 px-3 py-2.5"><Checkbox checked={allSelected} onCheckedChange={(checked) => handleToggleAll(Boolean(checked))} /></TableHead>
                        <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">Nama Siswa</TableHead>
                        <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">NIS</TableHead>
                        <TableHead className="px-3 py-2.5 text-[10px] font-bold text-[#6c8279]">Jenis Kelamin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingStudents ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-xs text-[#a0afa8]">Memuat siswa yang belum terdaftar...</TableCell></TableRow>
                      ) : availableStudentOptions.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-xs text-[#a0afa8]">Tidak ada siswa yang tersedia pada tahun ajaran ini.</TableCell></TableRow>
                      ) : availableStudentOptions.map((opt) => {
                        const checked = selectedIds.includes(opt.value);
                        const student = availableStudents.find((entry) => entry.id === opt.value);
                        return (
                          <TableRow key={opt.value} className="cursor-pointer border-b border-[#f0f5f1] hover:bg-[#f6fbf7]" onClick={() => handleToggleOne(opt.value, !checked)}>
                            <TableCell className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}><Checkbox checked={checked} onCheckedChange={(next) => handleToggleOne(opt.value, Boolean(next))} /></TableCell>
                            <TableCell className="px-3 py-2.5 text-xs font-semibold text-[#2b493e]">{opt.label}</TableCell>
                            <TableCell className="px-3 py-2.5 text-xs text-[#3e5c50]">{student?.nis ?? "-"}</TableCell>
                            <TableCell className="px-3 py-2.5 text-xs text-[#3e5c50]">{student?.jenis_kelamin === "L" ? "Laki-laki" : student?.jenis_kelamin === "P" ? "Perempuan" : "-"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#dce8e0] bg-[#f8fbf9] px-4 py-5 text-center text-xs text-[#82978e]">Pilih tahun ajaran untuk menampilkan siswa yang tersedia.</div>
            )}
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
                disabled={isSubmitting || selectedIds.length === 0}
                className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]"
              >
                {isSubmitting ? "Menyimpan..." : `Simpan ${selectedIds.length > 0 ? `(${selectedIds.length})` : ""}`}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
