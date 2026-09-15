"use client";

import { useEffect, useMemo, useState, useTransition, useActionState } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/types";
import {
  MASTER_ENTITIES,
  MASTER_LABELS,
  type MasterEntity,
} from "@/features/master/schema";
import { deleteMaster, saveMaster } from "./actions";

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

type EntityConfig = {
  nameColumn: string;
  secondaryColumn?: string;
  fields: FieldConfig[];
};

const ENTITY_CONFIG: Record<MasterEntity, EntityConfig> = {
  status_kepegawaian: {
    nameColumn: "nama_status",
    fields: [{ name: "nama_status", label: "Nama Status", type: "text", required: true }],
  },
  jabatan: {
    nameColumn: "nama_jabatan",
    secondaryColumn: "kategori",
    fields: [
      { name: "nama_jabatan", label: "Nama Jabatan", type: "text", required: true },
      {
        name: "kategori",
        label: "Kategori",
        type: "select",
        options: [
          { value: "fungsional", label: "Fungsional" },
          { value: "struktural", label: "Struktural" },
        ],
      },
    ],
  },
  golongan: {
    nameColumn: "kode_golongan",
    secondaryColumn: "keterangan",
    fields: [
      { name: "kode_golongan", label: "Kode Golongan", type: "text", required: true, placeholder: "III/a" },
      { name: "keterangan", label: "Keterangan", type: "text" },
    ],
  },
  unit_kerja: {
    nameColumn: "nama_unit",
    fields: [
      { name: "nama_unit", label: "Nama Unit", type: "text", required: true },
      { name: "parent_unit_id", label: "Unit Induk", type: "select" },
    ],
  },
  mapel: {
    nameColumn: "nama_mapel",
    secondaryColumn: "kode_mapel",
    fields: [
      { name: "nama_mapel", label: "Nama Mata Pelajaran", type: "text", required: true },
      { name: "kode_mapel", label: "Kode Mapel", type: "text", required: true, placeholder: "MAT" },
    ],
  },
  jurusan: {
    nameColumn: "nama_jurusan",
    fields: [{ name: "nama_jurusan", label: "Nama Jurusan", type: "text", required: true }],
  },
  jenis_sertifikasi: {
    nameColumn: "nama_sertifikasi",
    fields: [{ name: "nama_sertifikasi", label: "Nama Sertifikasi", type: "text", required: true }],
  },
  jenis_cuti_izin: {
    nameColumn: "nama_jenis",
    secondaryColumn: "kuota_hari",
    fields: [
      { name: "nama_jenis", label: "Nama Jenis", type: "text", required: true },
      { name: "kuota_hari", label: "Kuota Hari (opsional)", type: "text", placeholder: "12" },
    ],
  },
  tahun_ajaran: {
    nameColumn: "nama_tahun_ajaran",
    secondaryColumn: "semester",
    fields: [
      { name: "nama_tahun_ajaran", label: "Tahun Ajaran", type: "text", required: true, placeholder: "2025/2026" },
      {
        name: "semester",
        label: "Semester",
        type: "select",
        options: [
          { value: "ganjil", label: "Ganjil" },
          { value: "genap", label: "Genap" },
        ],
      },
      { name: "tanggal_mulai", label: "Tanggal Mulai", type: "date" },
      { name: "tanggal_selesai", label: "Tanggal Selesai", type: "date" },
      { name: "status_aktif", label: "Status Aktif", type: "checkbox" },
    ],
  },
};

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
  const [deleting, setDeleting] = useState<MasterRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const config = ENTITY_CONFIG[entity];
  const rows = data[entity] ?? [];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      Object.values(row)
        .filter((value) => typeof value === "string")
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, rows]);

  const handleDelete = () => {
    if (!deleting) return;
    const target = deleting;
    startTransition(async () => {
      const result = await deleteMaster(entity, String(target.id));
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
      setDeleting(null);
    });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: MasterRow) => {
    setEditing(row);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Master Data</h1>
          <p className="text-sm text-muted-foreground">
            Data referensi yang dipakai oleh modul lain (pegawai, kelas, dll).
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate}>
            <PlusIcon data-icon="inline-start" />
            Tambah {MASTER_LABELS[entity]}
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <select
            value={entity}
            onChange={(event) => {
              setEntity(event.target.value as MasterEntity);
              setQuery("");
            }}
            aria-label="Pilih jenis data master"
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56 dark:bg-input/30"
          >
            {MASTER_ENTITIES.map((item) => (
              <option key={item} value={item}>
                {MASTER_LABELS[item]}
              </option>
            ))}
          </select>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari..."
              className="pl-8"
            />
          </div>
          <CardDescription className="sm:justify-self-end">
            {filtered.length} dari {rows.length} data
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada data</p>
              <p className="text-sm text-muted-foreground">
                {canManage
                  ? `Tambahkan ${MASTER_LABELS[entity].toLowerCase()} pertama.`
                  : "Hubungi admin sekolah untuk menambahkan data."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((row) => (
                <div
                  key={String(row.id)}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {String(row[config.nameColumn] ?? "-")}
                      {entity === "tahun_ajaran" && row.status_aktif ? (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-500">
                          Aktif
                        </span>
                      ) : null}
                    </p>
                    {config.secondaryColumn ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {String(row[config.secondaryColumn] ?? "-")}
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                        Ubah
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(row)}
                      >
                        Hapus
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <MasterFormDialog
        key={editing?.id ? `${entity}-${editing.id}` : `new-${entity}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        entity={entity}
        config={config}
        allRows={data}
        editing={editing}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? String(deleting[config.nameColumn] ?? "") : ""} akan dihapus
              permanen. Data yang masih dipakai di modul lain tidak bisa dihapus.
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

function MasterFormDialog({
  open,
  onOpenChange,
  entity,
  config,
  allRows,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: MasterEntity;
  config: EntityConfig;
  allRows: Record<string, MasterRow[]>;
  editing: MasterRow | null;
}) {
  const isEdit = Boolean(editing);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveMaster,
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

  const unitOptions = (allRows.unit_kerja ?? [])
    .filter((row) => row.id !== editing?.id)
    .map((row) => ({ value: String(row.id), label: String(row.nama_unit) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Ubah ${MASTER_LABELS[entity]}` : `Tambah ${MASTER_LABELS[entity]}`}
            </DialogTitle>
            <DialogDescription>
              Data ini hanya berlaku untuk sekolah Anda.
            </DialogDescription>
          </DialogHeader>

          {editing ? <input type="hidden" name="id" value={String(editing.id)} /> : null}
          <input type="hidden" name="entity" value={entity} />

          {config.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              {field.type === "checkbox" ? (
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id={field.name}
                    name={field.name}
                    defaultChecked={Boolean(editing?.[field.name])}
                  />
                  <Label htmlFor={field.name} className="cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ) : (
                <>
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === "select" ? (
                    <select
                      id={field.name}
                      name={field.name}
                      defaultValue={editing?.[field.name] ? String(editing[field.name]) : ""}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
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
                      defaultValue={editing?.[field.name] ? String(editing[field.name]) : ""}
                      placeholder={field.placeholder}
                      required={field.required && !isEdit}
                    />
                  )}
                </>
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
