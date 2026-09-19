"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  Columns3Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserPlusIcon,
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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type {
  FormState,
  Pegawai,
  PegawaiPendidikan,
  PegawaiSertifikasi,
} from "@/lib/types";
import { deletePegawai, savePegawai } from "./actions";
import type { PegawaiJabatanInfo, PegawaiOptionLists } from "./page";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type Permissions = { create: boolean; update: boolean; delete: boolean };

type ColumnKey = "name" | "nip" | "status" | "role" | "golongan" | "unit" | "active";

const allColumns: { key: ColumnKey; label: string }[] = [
  { key: "name", label: "Nama" },
  { key: "nip", label: "NIP" },
  { key: "status", label: "Status" },
  { key: "role", label: "Jabatan" },
  { key: "golongan", label: "Golongan" },
  { key: "unit", label: "Unit Kerja" },
  { key: "active", label: "Status Aktif" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function PegawaiClient({
  pegawai,
  options,
  pegawaiJabatan,
  pegawaiPendidikan,
  pegawaiSertifikasi,
  permissions,
}: {
  pegawai: Pegawai[];
  options: PegawaiOptionLists;
  pegawaiJabatan: Record<string, PegawaiJabatanInfo[]>;
  pegawaiPendidikan: Record<string, PegawaiPendidikan[]>;
  pegawaiSertifikasi: Record<string, PegawaiSertifikasi[]>;
  permissions: Permissions;
}) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Pegawai | null>(null);
  const [deleting, setDeleting] = useState<Pegawai | null>(null);
  const [isPending, startTransition] = useTransition();

  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(["name", "nip", "status", "role", "active"])
  );
  const [sortColumn, setSortColumn] = useState<ColumnKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const statusName = useMemo(
    () => new Map(options.status_kepegawaian.map((item) => [item.id, item.nama_status])),
    [options.status_kepegawaian]
  );
  const golonganCode = useMemo(
    () => new Map(options.golongan.map((item) => [item.id, item.kode_golongan])),
    [options.golongan]
  );
  const unitKerjaName = useMemo(
    () => new Map(options.unit_kerja.map((item) => [item.id, item.nama_unit])),
    [options.unit_kerja]
  );

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
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
      result = pegawai.filter((item) => {
        const jabatanGabungan = (pegawaiJabatan[item.id] ?? [])
          .map((info) => info.nama)
          .join(" ");
        return [
          item.full_name,
          item.nip ?? "",
          item.niy ?? "",
          item.nuptk ?? "",
          jabatanGabungan,
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
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
        case "status":
          valA = statusName.get(a.status_kepegawaian_id ?? "") ?? "";
          valB = statusName.get(b.status_kepegawaian_id ?? "") ?? "";
          break;
        case "role":
          valA = (pegawaiJabatan[a.id] ?? [])
            .map((info) => (info.is_utama ? `★ ${info.nama}` : info.nama))
            .join(", ");
          valB = (pegawaiJabatan[b.id] ?? [])
            .map((info) => (info.is_utama ? `★ ${info.nama}` : info.nama))
            .join(", ");
          break;
        case "golongan":
          valA = golonganCode.get(a.golongan_id ?? "") ?? "";
          valB = golonganCode.get(b.golongan_id ?? "") ?? "";
          break;
        case "unit":
          valA = unitKerjaName.get(a.unit_kerja_id ?? "") ?? "";
          valB = unitKerjaName.get(b.unit_kerja_id ?? "") ?? "";
          break;
        case "active":
          valA = a.is_active ? "1" : "0";
          valB = b.is_active ? "1" : "0";
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
    golonganCode,
    unitKerjaName,
  ]);

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
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: Pegawai) => {
    setEditing(item);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-[#4c9a77]">
            Manajemen Orang
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">
            Data Pegawai
          </h1>
          <p className="mt-2 text-xs text-[#82978d]">
            Kelola data kepegawaian sekolah. Akun login dikelola lewat menu User.
          </p>
        </div>
        {permissions.create ? (
          <Button
            onClick={openCreate}
            className="h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
          >
            <UserPlusIcon data-icon="inline-start" className="size-4" />
            Tambah Pegawai
          </Button>
        ) : null}
      </div>

      <Card className="rounded-[15px] border-[#e2ece5] bg-white shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 border-b border-[#edf2ee] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-heading text-[15px] tracking-[-0.035em] text-[#21483b]">
              Daftar Pegawai
            </CardTitle>
            <CardDescription className="mt-1.5 text-[11px] text-[#8b9f95]">
              {filteredAndSorted.length} dari {pegawai.length} pegawai
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#91a49a]" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau NIP..."
                className="h-[35px] rounded-[9px] border-[#e2ece5] bg-[#fcfdfc] pl-9 text-xs text-[#284a3d] placeholder:text-[#91a49a] focus-visible:border-[#9dc7a8] focus-visible:ring-[#4d986f]/10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[35px] gap-1.5 shrink-0 rounded-[9px] border-[#e2ece5] bg-white text-[11px] font-bold text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                  />
                }
              >
                <Columns3Icon className="size-4 text-[#4d8669]" />
                Kolom
                <ChevronDownIcon className="size-4 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-[11px] border-[#e2ece5] p-1.5"
              >
                <DropdownMenuLabel className="border-b border-[#eef2ee] pb-2 text-[10px] font-bold text-[#2b493e]">
                  Pilih kolom yang ditampilkan
                </DropdownMenuLabel>
                {allColumns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    className="text-[11px] text-[#5d7a6e]"
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filteredAndSorted.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#3e5c50]">Belum ada pegawai</p>
              <p className="mt-1 text-xs text-[#a0afa8]">
                {permissions.create
                  ? "Tambahkan pegawai pertama untuk mulai."
                  : "Hubungi admin sekolah untuk menambahkan data."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#e5eee8]">
                  {visibleColumnList.map((col) => {
                    const isSorted = sortColumn === col.key;
                    return (
                      <TableHead
                        key={col.key}
                        className="cursor-pointer px-4 py-2.5 text-[10px] font-bold whitespace-nowrap text-[#6c8279] hover:text-[#2b7254]"
                        onClick={() => handleSort(col.key)}
                      >
                        <button type="button" className="flex items-center gap-1">
                          <span className={isSorted ? "text-[#2b7254]" : ""}>
                            {col.label}
                          </span>
                          {isSorted ? (
                            sortDirection === "asc" ? (
                              <ArrowUpIcon className="size-3.5 text-[#2b7254]" />
                            ) : (
                              <ArrowDownIcon className="size-3.5 text-[#2b7254]" />
                            )
                          ) : (
                            <ArrowUpDownIcon className="size-3.5 text-[#9aaa9f]" />
                          )}
                        </button>
                      </TableHead>
                    );
                  })}
                  <TableHead className="px-4 text-right text-[10px] font-bold text-[#6c8279]">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
                  >
                    {visibleColumnList.map((col) => {
                      switch (col.key) {
                        case "name":
                          return (
                            <TableCell key={col.key} className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback className="bg-[#def1e2] text-[10px] font-bold text-[#2b7254]">
                                    {getInitials(item.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <strong className="block truncate text-[12px] font-bold text-[#2b493e]">
                                    {item.full_name}
                                  </strong>
                                  <span className="block truncate text-[10px] text-[#7d9389]">
                                    {item.nip || item.niy || item.nuptk || "Tidak ada NIP"}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          );
                        case "nip":
                          return (
                            <TableCell key={col.key} className="px-4 py-3 text-[10px] text-[#7d9389]">
                              {item.nip ?? "-"}
                            </TableCell>
                          );
                        case "status": {
                          const statusText = statusName.get(item.status_kepegawaian_id ?? "");
                          const isPermanent =
                            !!statusText &&
                            statusText.toLowerCase().includes("tetap") &&
                            !statusText.toLowerCase().includes("tidak");
                          return (
                            <TableCell key={col.key} className="px-4 py-3">
                              <span
                                className={`inline-block rounded-[5px] px-2 py-1 text-[9px] font-bold ${
                                  isPermanent
                                    ? "bg-[#e7f5e9] text-[#2b7254]"
                                    : "bg-[#fcf3e3] text-[#a67437]"
                                }`}
                              >
                                {statusText ?? "-"}
                              </span>
                            </TableCell>
                          );
                        }
                        case "role": {
                          const roles = pegawaiJabatan[item.id] ?? [];
                          const labels = roles.map((info) => info.nama).join(", ") || "-";
                          return (
                            <TableCell key={col.key} className="max-w-[220px] px-4 py-3 text-[11px] text-[#5d7a6e]">
                              <span className="block truncate" title={labels}>
                                {labels}
                              </span>
                            </TableCell>
                          );
                        }
                        case "golongan":
                          return (
                            <TableCell key={col.key} className="px-4 py-3 text-[10px] text-[#7d9389]">
                              {golonganCode.get(item.golongan_id ?? "") ?? "-"}
                            </TableCell>
                          );
                        case "unit":
                          return (
                            <TableCell key={col.key} className="px-4 py-3 text-[11px] text-[#3e5c50]">
                              {unitKerjaName.get(item.unit_kerja_id ?? "") ?? "-"}
                            </TableCell>
                          );
                        case "active":
                          return (
                            <TableCell key={col.key} className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-[5px] rounded-[99px] px-2 py-1 text-[9px] font-bold ${
                                  item.is_active
                                    ? "bg-[#e7f5e9] text-[#2b7254]"
                                    : "bg-[#fdf0ee] text-[#ad685d]"
                                }`}
                              >
                                <span
                                  className={`size-[5px] rounded-full ${
                                    item.is_active ? "bg-[#2b7254]" : "bg-[#ad685d]"
                                  }`}
                                />
                                {item.is_active ? "Aktif" : "Nonaktif"}
                              </span>
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}
                    <TableCell className="px-4">
                      <div className="flex justify-end gap-1">
                        {permissions.update ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ubah"
                            className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
                            onClick={() => openEdit(item)}
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                        ) : null}
                        {permissions.delete ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Hapus"
                            className="border border-[#e1ebe4] bg-white text-[#ad685d] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PegawaiFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        options={options}
        jabatanTerpilih={editing ? (pegawaiJabatan[editing.id] ?? []) : []}
        pendidikanAwal={editing ? (pegawaiPendidikan[editing.id] ?? []) : []}
        sertifikasiAwal={editing ? (pegawaiSertifikasi[editing.id] ?? []) : []}
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

function PegawaiFormDialog({
  open,
  onOpenChange,
  editing,
  options,
  jabatanTerpilih,
  pendidikanAwal,
  sertifikasiAwal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Pegawai | null;
  options: PegawaiOptionLists;
  jabatanTerpilih: PegawaiJabatanInfo[];
  pendidikanAwal: PegawaiPendidikan[];
  sertifikasiAwal: PegawaiSertifikasi[];
}) {
  const isEdit = Boolean(editing);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
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
      onOpenChange(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onOpenChange]);

  const selectClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

  const inputClass =
    "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Ubah Pegawai" : "Tambah Pegawai"}</DialogTitle>
            <DialogDescription>
              Pegawai belum tentu punya akun login. Akun dibuat lewat menu User.
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

          <Tabs defaultValue="basic" className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start overflow-x-auto rounded-none border-b border-[#e5eee8] p-0"
            >
              <TabsTrigger value="basic">Informasi Dasar</TabsTrigger>
              <TabsTrigger value="employment">Informasi Kepegawaian</TabsTrigger>
              <TabsTrigger value="education">Riwayat Pendidikan</TabsTrigger>
              <TabsTrigger value="certification">Sertifikasi</TabsTrigger>
            </TabsList>

            {/* ===== Informasi Dasar ===== */}
            <TabsContent value="basic" keepMounted className="pt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-[#24483b]">Informasi dasar</p>
                  <p className="mt-1 text-[10px] text-[#93a49c]">
                    Identitas utama dan kontak pegawai yang akan disimpan.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="full_name" required>
                      Nama Lengkap
                    </FieldLabel>
                    <Input
                      id="full_name"
                      name="full_name"
                      defaultValue={editing?.full_name ?? ""}
                      placeholder="Contoh: Ahmad Fauzi, S.Pd"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="nip" optional>NIP</FieldLabel>
                    <Input id="nip" name="nip" defaultValue={editing?.nip ?? ""} placeholder="Nomor Induk Pegawai" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="niy" optional>NIY</FieldLabel>
                    <Input id="niy" name="niy" defaultValue={editing?.niy ?? ""} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="nuptk" optional>NUPTK</FieldLabel>
                    <Input id="nuptk" name="nuptk" defaultValue={editing?.nuptk ?? ""} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="jenis_kelamin" optional>Jenis Kelamin</FieldLabel>
                    <select id="jenis_kelamin" name="jenis_kelamin" defaultValue={editing?.jenis_kelamin ?? ""} className={selectClass}>
                      <option value="">- tidak diisi -</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="tempat_lahir" optional>Tempat Lahir</FieldLabel>
                    <Input id="tempat_lahir" name="tempat_lahir" defaultValue={editing?.tempat_lahir ?? ""} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="tanggal_lahir" optional>Tanggal Lahir</FieldLabel>
                    <Input id="tanggal_lahir" name="tanggal_lahir" type="date" defaultValue={editing?.tanggal_lahir ?? ""} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="agama_id" optional>Agama</FieldLabel>
                    <select id="agama_id" name="agama_id" defaultValue={editing?.agama_id ?? ""} className={selectClass}>
                      <option value="">- tidak ada -</option>
                      {options.agama.map((item) => (
                        <option key={item.id} value={item.id}>{item.nama_agama}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-[#e3ece6]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#a8b8b1]">Kontak</span>
                  <div className="h-px flex-1 bg-[#e3ece6]" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="phone" optional>Telepon</FieldLabel>
                    <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} placeholder="08xx" className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="email" optional>Email</FieldLabel>
                    <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} className={inputClass} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <FieldLabel htmlFor="alamat" optional>Alamat</FieldLabel>
                    <Input id="alamat" name="alamat" defaultValue={editing?.alamat ?? ""} className={inputClass} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== Informasi Kepegawaian ===== */}
            <TabsContent value="employment" keepMounted className="pt-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-[#24483b]">Informasi kepegawaian</p>
                  <p className="mt-1 text-[10px] text-[#93a49c]">
                    Atur status, jabatan, dan unit kerja pegawai.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FieldLabel htmlFor="status_kepegawaian_id" optional>Status Kepegawaian</FieldLabel>
                    <select id="status_kepegawaian_id" name="status_kepegawaian_id" defaultValue={editing?.status_kepegawaian_id ?? ""} className={selectClass}>
                      <option value="">- tidak ada -</option>
                      {options.status_kepegawaian.map((item) => (
                        <option key={item.id} value={item.id}>{item.nama_status}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="jabatan_utama_id" optional>Jabatan Utama</FieldLabel>
                    <select id="jabatan_utama_id" name="jabatan_utama_id" defaultValue={jabatanTerpilih.find((info) => info.is_utama)?.jabatan_id ?? ""} key={selectedJabatanIds.join(",")} className={selectClass}>
                      <option value="">- pilih jabatan utama -</option>
                      {options.jabatan.filter((jabatan) => selectedJabatanIds.includes(jabatan.id)).map((jabatan) => (
                        <option key={jabatan.id} value={jabatan.id}>{jabatan.nama_jabatan}</option>
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
                    <FieldLabel htmlFor="golongan_id" optional>Golongan</FieldLabel>
                    <select id="golongan_id" name="golongan_id" defaultValue={editing?.golongan_id ?? ""} className={selectClass}>
                      <option value="">- tidak ada -</option>
                      {options.golongan.map((item) => (
                        <option key={item.id} value={item.id}>{item.kode_golongan}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="unit_kerja_id" optional>Unit Kerja</FieldLabel>
                    <select id="unit_kerja_id" name="unit_kerja_id" defaultValue={editing?.unit_kerja_id ?? ""} className={selectClass}>
                      <option value="">- tidak ada -</option>
                      {options.unit_kerja.map((item) => (
                        <option key={item.id} value={item.id}>{item.nama_unit}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <FieldLabel htmlFor="tahun_masuk" optional>Tahun Masuk</FieldLabel>
                    <Input id="tahun_masuk" name="tahun_masuk" type="date" defaultValue={editing?.tahun_masuk ?? ""} className={inputClass} />
                  </div>
                  <div className="flex items-center gap-2.5 self-end pb-2 sm:col-span-2">
                    <Checkbox id="is_active_checkbox" checked={isActive} onCheckedChange={(checked) => setIsActive(Boolean(checked))} />
                    <Label htmlFor="is_active_checkbox" className="cursor-pointer">Pegawai aktif</Label>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ===== Riwayat Pendidikan ===== */}
            <TabsContent value="education" keepMounted className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#24483b]">Riwayat Pendidikan</p>
                    <p className="mt-1 text-[10px] text-[#93a49c]">
                      Tambahkan riwayat pendidikan formal pegawai. Bisa lebih dari satu.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPendidikanRows((prev) => [...prev, emptyPendidikanRow()])}>
                    <PlusIcon data-icon="inline-start" /> Tambah Pendidikan
                  </Button>
                </div>
                {pendidikanRows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#dfeae3] py-4 text-center text-xs text-muted-foreground">
                    Belum ada riwayat pendidikan (semua kolom opsional).
                  </p>
                ) : (
                  pendidikanRows.map((row, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border border-[#dfeae3] bg-white p-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`pendidikan_jenjang_${index}`} optional>Jenjang</FieldLabel>
                        <select id={`pendidikan_jenjang_${index}`} value={row.jenjang_pendidikan_id} onChange={(event) => updatePendidikanRow(index, { jenjang_pendidikan_id: event.target.value })} className={selectClass}>
                          <option value="">- tidak ada -</option>
                          {options.jenjang_pendidikan.map((item) => (
                            <option key={item.id} value={item.id}>{item.nama_jenjang}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`pendidikan_jurusan_${index}`} optional>Jurusan</FieldLabel>
                        <Input id={`pendidikan_jurusan_${index}`} value={row.jurusan} onChange={(event) => updatePendidikanRow(index, { jurusan: event.target.value })} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`pendidikan_institusi_${index}`} optional>Nama Institusi</FieldLabel>
                        <Input id={`pendidikan_institusi_${index}`} value={row.nama_institusi} onChange={(event) => updatePendidikanRow(index, { nama_institusi: event.target.value })} className={inputClass} />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="w-full space-y-2">
                          <FieldLabel htmlFor={`pendidikan_tahun_${index}`} optional>Tahun Lulus</FieldLabel>
                          <Input id={`pendidikan_tahun_${index}`} value={row.tahun_lulus} onChange={(event) => updatePendidikanRow(index, { tahun_lulus: event.target.value })} placeholder="Contoh: 2020" className={inputClass} />
                        </div>
                        <Button type="button" variant="outline" size="icon" aria-label="Hapus baris pendidikan" className="shrink-0 border-[#edcbc6] bg-[#fffafa] text-[#d26d60] hover:border-[#d26d60] hover:bg-[#d26d60] hover:text-white" onClick={() => setPendidikanRows((prev) => prev.filter((_, i) => i !== index))}>
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* ===== Sertifikasi ===== */}
            <TabsContent value="certification" keepMounted className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#24483b]">Sertifikasi</p>
                    <p className="mt-1 text-[10px] text-[#93a49c]">
                      Tambahkan sertifikasi atau pelatihan profesional pegawai.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSertifikasiRows((prev) => [...prev, emptySertifikasiRow()])}>
                    <PlusIcon data-icon="inline-start" /> Tambah Sertifikasi
                  </Button>
                </div>
                {sertifikasiRows.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[#dfeae3] py-4 text-center text-xs text-muted-foreground">
                    Belum ada sertifikasi.
                  </p>
                ) : (
                  sertifikasiRows.map((row, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border border-[#dfeae3] bg-white p-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`sertifikasi_nama_${index}`} required>Nama Sertifikasi</FieldLabel>
                        <Input id={`sertifikasi_nama_${index}`} value={row.nama_sertifikasi} onChange={(event) => updateSertifikasiRow(index, { nama_sertifikasi: event.target.value })} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`sertifikasi_nomor_${index}`} optional>Nomor Sertifikat</FieldLabel>
                        <Input id={`sertifikasi_nomor_${index}`} value={row.nomor_sertifikat} onChange={(event) => updateSertifikasiRow(index, { nomor_sertifikat: event.target.value })} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`sertifikasi_berlaku_${index}`} optional>Tanggal Berlaku</FieldLabel>
                        <Input id={`sertifikasi_berlaku_${index}`} type="date" value={row.tanggal_berlaku} onChange={(event) => updateSertifikasiRow(index, { tanggal_berlaku: event.target.value })} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`sertifikasi_kedaluwarsa_${index}`} optional>Tanggal Kedaluwarsa</FieldLabel>
                        <Input id={`sertifikasi_kedaluwarsa_${index}`} type="date" value={row.tanggal_kedaluwarsa} onChange={(event) => updateSertifikasiRow(index, { tanggal_kedaluwarsa: event.target.value })} className={inputClass} />
                      </div>
                      <div className="flex items-end gap-2 sm:col-span-2">
                        <div className="w-full space-y-2">
                          <FieldLabel htmlFor={`sertifikasi_penerbit_${index}`} optional>Penerbit</FieldLabel>
                          <Input id={`sertifikasi_penerbit_${index}`} value={row.penerbit} onChange={(event) => updateSertifikasiRow(index, { penerbit: event.target.value })} className={inputClass} />
                        </div>
                        <Button type="button" variant="outline" size="icon" aria-label="Hapus baris sertifikasi" className="shrink-0 border-[#edcbc6] bg-[#fffafa] text-[#d26d60] hover:border-[#d26d60] hover:bg-[#d26d60] hover:text-white" onClick={() => setSertifikasiRows((prev) => prev.filter((_, i) => i !== index))}>
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-[9px] border border-[#185743] bg-[#185743] text-white hover:bg-[#124936]">
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Pegawai"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}