"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  Columns3Icon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheck,
  DownloadIcon,
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
import { Separator } from "@/components/ui/separator";
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
import type { ImportPegawaiResult } from "./import-action";
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
  const [deleting, setDeleting] = useState<Pegawai | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<
    NonNullable<ImportPegawaiResult["result"]> | null
  >(null);
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
            <Button
              variant="outline"
              onClick={handleImport}
              className="h-9 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
            >
              <UploadIcon data-icon="inline-start" className="size-4" />
              Import Excel
            </Button>
          </div>
        ) : null}
      </div>

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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau NIP..."
                className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
              />
            </div>
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
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#e5eee8] hover:bg-transparent">
                {visibleColumnList.map((col, index) => {
                 const isSorted = sortColumn === col.key;
                 return (
                   <TableHead
                     key={col.key}
                     onClick={() => handleSort(col.key)}
                     className={`px-3.5 py-2.5 text-[10px] font-bold text-[#6c8279] whitespace-nowrap cursor-pointer select-none hover:text-[#2b7254] ${index === 0 ? "pl-6" : ""}`}
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
                <TableHead className="w-10 pr-6 justify-end text-right text-[10px] font-bold text-[#6c8279]">Aksi</TableHead>
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
                filteredAndSorted.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-b border-[#f0f5f1] hover:bg-[#f6fbf7]"
                  >
                    {visibleColumnList.map((col) => {
                      switch (col.key) {
                        case "name":
                          return (
                            <TableCell
                              key={col.key}
                              className="pl-6 px-3.5 py-3 align-middle"
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
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 font-mono text-[10px] text-[#7d9389] align-middle"
                            >
                              {item.nip || "-"}
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
                          const jabatanList = pegawaiJabatan[item.id] ?? [];
                          const roleLabel =
                            jabatanList.length > 0
                              ? jabatanList.map((info) => info.nama).join(", ")
                              : "-";
                          return (
                            <TableCell
                              key={col.key}
                              className="max-w-[220px] px-3.5 py-3 align-middle"
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
                        case "golongan":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 font-mono text-[10px] text-[#7d9389] align-middle"
                            >
                              {golonganCode.get(item.golongan_id ?? "") || "-"}
                            </TableCell>
                          );
                        case "unit":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 text-xs text-[#3e5c50] align-middle"
                            >
                              {unitKerjaName.get(item.unit_kerja_id ?? "") || "-"}
                            </TableCell>
                          );
                        case "active":
                          return (
                            <TableCell
                              key={col.key}
                              className="px-3.5 py-3 align-middle"
                            >
                              <Badge
                                className={
                                  item.is_active
                                    ? "rounded-[99px] border-transparent bg-[#e7f5e9] px-[8px] py-[4px] text-[9px] font-bold text-[#2b7254] gap-[5px]"
                                    : "rounded-[99px] border-transparent bg-[#fdf0ee] px-[8px] py-[4px] text-[9px] font-bold text-[#ad685d] gap-[5px]"
                                }
                              >
                                <span
                                  className={
                                    "size-[5px] shrink-0 rounded-full " +
                                    (item.is_active
                                      ? "bg-[#2b7254]"
                                      : "bg-[#ad685d]")
                                  }
                                />
                                {item.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </TableCell>
                          );
                        default:
                          return null;
                      }
                    })}
                     <TableCell className="px-3 pr-6 py-3 align-middle">
                      {permissions.update || permissions.delete ? (
                        <div className="flex items-center justify-end gap-1">
                          {permissions.update ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Ubah"
                              className="border border-[#e1ebe4] bg-[#fff] text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]"
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
                              className="border border-[#e1ebe4] bg-[#fff] text-[#537467] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]"
                              onClick={() => setDeleting(item)}
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
        uploadPegawaiPhotoAction={uploadPegawaiPhotoAction}
        schoolId={schoolId}
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
  uploadPegawaiPhotoAction,
  schoolId,
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
}) {
  const isEdit = Boolean(editing);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(editing?.photo_url ?? null);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-hidden sm:max-w-[1000px] rounded-[17px] bg-[#fbfdfb] shadow-[0_24px_70px_rgb(13_50_35/22%)] p-0">
        <form action={formAction} className="flex h-full max-h-[92vh] flex-col">
          <DialogHeader className="px-6 pb-4 pt-6">
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

          <div className="flex-1 overflow-y-auto px-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList
              variant="line"
              className="w-full justify-start border-b rounded-none p-0 h-auto gap-1 overflow-x-auto"
            >
              <TabsTrigger value="basic">Informasi Dasar</TabsTrigger>
              <TabsTrigger value="employment">Informasi Kepegawaian</TabsTrigger>
              <TabsTrigger value="education">Riwayat Pendidikan</TabsTrigger>
              <TabsTrigger value="certification">Sertifikasi</TabsTrigger>
            </TabsList>

            {/* ===== Tab 1: Informasi Dasar ===== */}
            <TabsContent value="basic" keepMounted className="space-y-4 pt-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Informasi Dasar</h3>
                  <p className="text-xs text-muted-foreground">
                    Identitas utama dan kontak pegawai yang akan disimpan.
                  </p>
                </div>
                <a
                  href="/templates/template-import-pegawai.xlsx"
                  download
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4b8669] hover:underline"
                >
                  <DownloadIcon className="size-3" />
                  Unduh template excel
                </a>
              </div>

              <input type="hidden" name="photo_url" value={photoUrl ?? ""} />

              <div className="grid items-start gap-4 sm:grid-cols-2">
                {/* Foto pegawai */}
                <div className="space-y-2">
                  <FieldLabel htmlFor="photo" optional>Foto</FieldLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-16 rounded-[9px] border-2 border-[#e2ece5]">
                      {photoUrl ? (
                        <AvatarImage src={photoUrl} alt={editing?.full_name ?? "Pegawai"} />
                      ) : null}
                      <AvatarFallback className="rounded-[9px] bg-[#e3f0e9] text-[#4b8669]">
                        {editing?.full_name
                          ? getInitials(editing.full_name)
                          : <UserIcon className="size-7" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={handleFileChange}
                        disabled={isUploading}
                        className="text-xs file:cursor-pointer file:rounded-[9px] file:border-0 file:bg-[#185743] file:font-bold file:text-white file:hover:bg-[#124936]"
                      />
                      {isUploading && <p className="text-xs text-[#4b8669]">Mengunggah...</p>}
                      {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
                    </div>
                    {photoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          setPhotoUrl(null);
                          setUploadError(null);
                        }}
                        aria-label="Hapus foto"
                      >
                        <XIcon className="size-4 text-[#83988e]" />
                      </Button>
                    )}
                  </div>
                </div>

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

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-start text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-background pr-2 w-fit">
                  Kontak
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                <h3 className="text-sm font-semibold text-foreground">Informasi Kepegawaian</h3>
                <p className="text-xs text-muted-foreground">
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
                  <h3 className="text-sm font-semibold text-foreground">Riwayat Pendidikan</h3>
                  <p className="text-xs text-muted-foreground">
                    Tambahkan riwayat pendidikan formal pegawai. Anda bisa menambahkan lebih dari satu.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPendidikanRows((prev) => [...prev, emptyPendidikanRow()])}
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
                  <h3 className="text-sm font-semibold text-foreground">Sertifikasi</h3>
                  <p className="text-xs text-muted-foreground">
                    Tambahkan sertifikasi atau pelatihan profesional pegawai.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSertifikasiRows((prev) => [...prev, emptySertifikasiRow()])}
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

          <DialogFooter className="justify-between px-6 pb-6 pt-4">
            <span className="text-[10px] text-[#96a9a0]">
              <ShieldCheck className="mr-1 inline-block size-[15px] text-[#5a9a74]" /> Data dapat dilengkapi kembali nanti
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Simpan pegawai"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
