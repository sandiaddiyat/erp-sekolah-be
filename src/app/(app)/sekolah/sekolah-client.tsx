"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { subscriptionProblem } from "@/lib/school";
import type { SchoolStatus, SchoolWithCounts } from "@/lib/types";
import { setSchoolStatus } from "./actions";
import { SchoolFormDialog } from "./_components/school-form-dialog";
import { SekolahTable } from "./_components/sekolah-table";

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

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (school: SchoolWithCounts) => {
    setEditing(school);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Sekolah</h1>
          <p className="text-sm text-muted-foreground">
            Daftarkan sekolah baru dan atur masa aktifnya.
          </p>
        </div>
        <Button onClick={openCreate}>
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
            <SekolahTable
              schools={filtered}
              isPending={isPending}
              onEdit={openEdit}
              onChangeStatus={changeStatus}
            />
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
