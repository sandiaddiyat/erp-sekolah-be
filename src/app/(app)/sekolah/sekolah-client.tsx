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
import { SchoolDetailDialog } from "./_components/school-detail-dialog";
import { SekolahTable } from "./_components/sekolah-table";

export function SekolahClient({ schools }: { schools: SchoolWithCounts[] }) {
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolWithCounts | null>(null);
  const [viewing, setViewing] = useState<SchoolWithCounts | null>(null);
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
    <div className="mx-auto max-w-[1190px] w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#4c9a77]">
            Profil Sekolah
          </p>
          <h1 className="font-heading text-2xl font-bold text-[#183d32]">
            Sekolah
          </h1>
          <p className="mt-1 text-sm text-[#82978d]">
            Daftarkan sekolah baru dan atur masa aktifnya.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="border-[#185743] bg-[#185743] text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]"
        >
          <PlusIcon data-icon="inline-start" />
          Daftarkan Sekolah
        </Button>
      </div>

      {expiredCount > 0 ? (
        <div className="rounded-lg border border-[#e8bcb4] bg-[#fcf3e3] px-3.5 py-2.5 text-sm text-[#a67437]">
          {expiredCount} sekolah perlu perpanjangan atau sedang disuspend.
        </div>
      ) : null}

      <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
        <CardHeader className="gap-3 border-b border-[#edf2ee] sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle className="font-heading text-[#21483b]">
              Daftar Sekolah
            </CardTitle>
            <CardDescription className="text-[#8b9f95]">
              {filtered.length} dari {schools.length} sekolah
            </CardDescription>
          </div>
          <div className="relative sm:w-64">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-[#91a49a]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, slug, atau NPSN..."
              className="h-[35px] w-full rounded-[9px] border border-[#e2ece5] bg-[#fcfdfc] pl-8 text-sm text-[#284a3d] placeholder-[#a8b7b0] focus:border-[#9dc7a8] focus:ring-[#4d986f]/10"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {filtered.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#3e5c50]">Belum ada sekolah</p>
              <p className="text-sm text-[#a0afa8]">
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
              onRowClick={setViewing}
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

      <SchoolDetailDialog
        school={viewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}
