"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import {
  BanIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  SchoolIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SCHOOL_STATUS_LABELS,
  daysUntilActiveEnd,
  formatActiveUntil,
  subscriptionProblem,
} from "@/lib/school";
import type { SchoolStatus, SchoolWithCounts } from "@/lib/types";
import { saveSchool, setSchoolStatus, type FormState } from "./actions";

const STATUS_VARIANT: Record<
  SchoolStatus,
  "default" | "secondary" | "destructive"
> = {
  active: "default",
  trial: "secondary",
  suspended: "destructive",
};

function StatusCell({ school }: { school: SchoolWithCounts }) {
  const problem = subscriptionProblem(school);
  const days = daysUntilActiveEnd(school);

  return (
    <div className="space-y-1">
      <Badge variant={STATUS_VARIANT[school.status]}>
        {SCHOOL_STATUS_LABELS[school.status]}
      </Badge>
      <p className="text-xs text-muted-foreground">
        s/d {formatActiveUntil(school.active_until)}
      </p>
      {problem === "expired" ? (
        <p className="text-xs text-destructive">Masa aktif sudah lewat</p>
      ) : days !== null && days >= 0 && days <= 30 ? (
        <p className="text-xs text-amber-600">Tersisa {days} hari</p>
      ) : null}
    </div>
  );
}

export function SekolahClient({ schools }: { schools: SchoolWithCounts[] }) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolWithCounts | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((school) =>
      [school.name, school.slug, school.npsn ?? "", school.level ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, schools]);

  const changeStatus = (school: SchoolWithCounts, status: SchoolStatus) => {
    startTransition(async () => {
      const result = await setSchoolStatus(school.id, status);
      if (result?.error) toast.error(result.error);
      else if (result?.success) toast.success(result.success);
    });
  };

  const expiredCount = schools.filter(
    (school) => subscriptionProblem(school) !== null
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Sekolah</h1>
          <p className="text-sm text-muted-foreground">
            Daftarkan sekolah baru dan atur masa aktifnya.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <PlusIcon data-icon="inline-start" />
          Daftarkan Sekolah
        </Button>
      </div>

      {expiredCount > 0 ? (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-500">
          {expiredCount} sekolah perlu perpanjangan atau sedang disuspend.
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>Daftar Sekolah</CardTitle>
            <CardDescription>
              {filtered.length} dari {schools.length} sekolah
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, slug, atau NPSN..."
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium">Belum ada sekolah</p>
              <p className="text-sm text-muted-foreground">
                {schools.length === 0
                  ? "Daftarkan sekolah pertama untuk mulai."
                  : "Tidak ada sekolah yang cocok dengan pencarian."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sekolah</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Status
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">User</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="flex items-center gap-1.5 font-medium">
                          <SchoolIcon className="size-4 text-muted-foreground" />
                          {school.name}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {school.slug}
                        </p>
                        {school.level || school.npsn ? (
                          <p className="text-xs text-muted-foreground">
                            {[school.level, school.npsn && `NPSN ${school.npsn}`]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <StatusCell school={school} />
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      {school.user_count}
                    </TableCell>
                    <TableCell className="hidden text-sm sm:table-cell">
                      {school.role_count}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={isPending}
                            />
                          }
                        >
                          <MoreHorizontalIcon />
                          <span className="sr-only">Aksi</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing(school);
                              setFormOpen(true);
                            }}
                          >
                            <PencilIcon />
                            Ubah
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {school.status === "suspended" ? (
                            <DropdownMenuItem
                              onClick={() => changeStatus(school, "active")}
                            >
                              <RotateCcwIcon />
                              Aktifkan kembali
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => changeStatus(school, "suspended")}
                            >
                              <BanIcon />
                              Suspend
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SchoolFormDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        school={editing}
      />
    </div>
  );
}

function SchoolFormDialog({
  open,
  onOpenChange,
  school,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolWithCounts | null;
}) {
  const isEdit = Boolean(school);
  const [withAdmin, setWithAdmin] = useState(false);
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    saveSchool,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Ubah Sekolah" : "Daftarkan Sekolah"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Perbarui identitas sekolah dan masa aktifnya."
                : "Sekolah baru otomatis mendapat 4 role bawaan. Kamu juga bisa langsung membuatkan akun adminnya."}
            </DialogDescription>
          </DialogHeader>

          {school ? <input type="hidden" name="id" value={school.id} /> : null}
          <input
            type="hidden"
            name="create_admin"
            value={withAdmin ? "true" : "false"}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Sekolah</Label>
              <Input
                id="name"
                name="name"
                defaultValue={school?.name ?? ""}
                placeholder="Contoh: SMP Nurul Huda"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                defaultValue={school?.slug ?? ""}
                placeholder="otomatis dari nama"
                disabled={isEdit}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="level">Jenjang</Label>
              <Input
                id="level"
                name="level"
                defaultValue={school?.level ?? ""}
                placeholder="SMP / SMA / MI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npsn">NPSN</Label>
              <Input
                id="npsn"
                name="npsn"
                defaultValue={school?.npsn ?? ""}
                placeholder="8 digit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telepon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={school?.phone ?? ""}
                placeholder="021xxxxxxx"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Sekolah</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={school?.email ?? ""}
              placeholder="info@sekolah.sch.id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Input
              id="address"
              name="address"
              defaultValue={school?.address ?? ""}
              placeholder="Jalan, nomor, kota"
            />
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={school?.status ?? "trial"}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="trial">Uji Coba</option>
                <option value="active">Aktif</option>
                <option value="suspended">Suspend</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active_until">Masa Aktif Sampai</Label>
              <Input
                id="active_until"
                name="active_until"
                type="date"
                defaultValue={school?.active_until ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Kosongkan bila tanpa batas waktu.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Input
              id="notes"
              name="notes"
              defaultValue={school?.notes ?? ""}
              placeholder="Catatan internal, mis. tanggal penagihan"
            />
          </div>

          {!isEdit ? (
            <>
              <Separator />
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="with_admin"
                  checked={withAdmin}
                  onCheckedChange={(checked) => setWithAdmin(checked)}
                />
                <Label htmlFor="with_admin" className="cursor-pointer">
                  Buatkan akun admin sekolah sekarang
                </Label>
              </div>

              {withAdmin ? (
                <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="admin_name">Nama Admin</Label>
                    <Input
                      id="admin_name"
                      name="admin_name"
                      placeholder="Contoh: Siti Aminah"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin_email">Email Admin</Label>
                    <Input
                      id="admin_email"
                      name="admin_email"
                      type="email"
                      placeholder="admin@sekolah.sch.id"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="admin_password">Password Awal</Label>
                    <Input
                      id="admin_password"
                      name="admin_password"
                      type="password"
                      placeholder="Minimal 8 karakter"
                    />
                    <p className="text-xs text-muted-foreground">
                      Berikan password ini ke admin sekolah, dan minta segera
                      diganti.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Menyimpan..."
                : isEdit
                  ? "Simpan Perubahan"
                  : "Daftarkan Sekolah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
