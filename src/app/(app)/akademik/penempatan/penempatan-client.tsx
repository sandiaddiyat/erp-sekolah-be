"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, SparklesIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AcademicYear, Class as SchoolClass, Grade } from "@/lib/types";
import type { UnplacedStudent } from "@/features/akademik/service";
import { finalizePlacement, generateDraft, savePlacement, fetchUnplaced } from "../actions";
import { FieldLabel } from "@/features/pegawai/FieldLabel";

type FormState = { error?: string; success?: string } | undefined;

const SELECT_CLASS =
  "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";

export function PenempatanClient({
  academicYears,
  classes,
  grades,
  draftCount,
  canManage,
}: {
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  grades: Grade[];
  draftCount: number;
  canManage: boolean;
}) {
  const [banner, setBanner] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState("");
  const [gradeId, setGradeId] = useState("");

  const activeYears = useMemo(
    () => academicYears.filter((y) => y.status === "active"),
    [academicYears]
  );

  // Default ke satu-satunya tahun ajaran aktif tanpa menyimpan state tambahan.
  const academicYearId = selectedYearId || (activeYears.length === 1 ? activeYears[0].id : "");
  const selectedYear = activeYears.find((y) => y.id === academicYearId) ?? null;
  const yearClasses = useMemo(
    () => classes.filter((c) => c.academic_year_id === academicYearId),
    [classes, academicYearId]
  );
  const gradeOptions = useMemo(() => {
    const used = new Set(yearClasses.map((c) => c.grade_id));
    return grades.filter((g) => used.has(g.id));
  }, [grades, yearClasses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mb-2 block text-[10px] font-bold tracking-[.1em] uppercase text-[#4c9a77]">
            Akademik
          </span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-.06em] text-[#183d32]">
            Penempatan Siswa
          </h1>
          <p className="text-sm text-muted-foreground">
            Tempatkan siswa secara manual, atau buat draft otomatis per tingkat.
          </p>
        </div>
        {draftCount > 0 ? (
          <Badge className="rounded-[6px] border-transparent bg-[#fcf3e3] px-2.5 py-1 text-[10px] font-bold text-[#a67437]">
            {draftCount} penempatan berstatus draft
          </Badge>
        ) : null}
      </div>

      {banner ? (
        <div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">
          {banner}
        </div>
      ) : null}

      {draftBanner ? (
        <div className="rounded-[10px] border border-[#f0dfb8] bg-[#fdf7e9] px-4 py-3 text-xs font-semibold text-[#a67437]">
          {draftBanner}
        </div>
      ) : null}

      <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
        <CardHeader>
          <CardTitle className="font-heading text-[#21483b]">Pilih Tahun Ajaran</CardTitle>
          <CardDescription className="text-[#8b9f95]">
            Semua penempatan dan draft hanya berlaku untuk tahun ajaran terpilih.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="px-6 pb-5">
            <div className="max-w-sm space-y-2">
              <FieldLabel htmlFor="placement-year" required>
                Tahun Ajaran
              </FieldLabel>
              <select
                id="placement-year"
                value={academicYearId}
                onChange={(event) => {
                  setSelectedYearId(event.target.value);
                  setGradeId("");
                  setBanner(null);
                  setDraftBanner(null);
                }}
                className={SELECT_CLASS}
                required
              >
                <option value="">- pilih tahun ajaran -</option>
                {activeYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedYear ? (
        <>
          <DraftCard
            yearId={selectedYear.id}
            grades={gradeOptions}
            gradeId={gradeId}
            setGradeId={(value) => {
              setGradeId(value);
              setDraftBanner(null);
            }}
            onMessage={(message, isDraft) => {
              if (isDraft) setDraftBanner(message);
              else setBanner(message);
            }}
            canManage={canManage}
          />

          <ManualPlacementCard
            yearId={selectedYear.id}
            yearClasses={yearClasses}
            onMessage={(message) => setBanner(message)}
            canManage={canManage}
          />
        </>
      ) : null}
    </div>
  );
}

function DraftCard({
  yearId,
  grades,
  gradeId,
  setGradeId,
  onMessage,
  canManage,
}: {
  yearId: string;
  grades: Grade[];
  gradeId: string;
  setGradeId: (value: string) => void;
  onMessage: (message: string, isDraft: boolean) => void;
  canManage: boolean;
}) {
  const [generateState, generateAction, isGenerating] = useActionState<
    FormState,
    FormData
  >(generateDraft, undefined);
  const [finalizeState, finalizeAction, isFinalizing] = useActionState<
    FormState,
    FormData
  >(finalizePlacement, undefined);

  useEffect(() => {
    if (generateState?.success) {
      onMessage(generateState.success, true);
    } else if (generateState?.error) {
      toast.error(generateState.error);
    }
  }, [generateState, onMessage]);

  useEffect(() => {
    if (finalizeState?.success) {
      onMessage(finalizeState.success, false);
    } else if (finalizeState?.error) {
      toast.error(finalizeState.error);
    }
  }, [finalizeState, onMessage]);

  return (
    <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-[#21483b]">
          <SparklesIcon data-icon="inline-start" className="size-4" />
          Penempatan Otomatis (Draft)
        </CardTitle>
        <CardDescription className="text-[#8b9f95]">
          Sistem akan membagikan siswa yang belum ditempatkan ke kelas secara bergiliran dan
          melewati kelas yang sudah penuh. Hasilnya berstatus draft dan bisa diedit sebelum
          difinalisasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-wrap items-end gap-3 px-6 pb-5">
          <form action={generateAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="academic_year_id" value={yearId} />
            <div className="min-w-[200px] space-y-2">
              <FieldLabel htmlFor="draft-grade" required>
                Tingkat
              </FieldLabel>
              <select
                id="draft-grade"
                name="grade_id"
                value={gradeId}
                onChange={(event) => setGradeId(event.target.value)}
                className={SELECT_CLASS}
                required
              >
                <option value="">- pilih tingkat -</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={isGenerating || isFinalizing || !canManage}
              className="h-10 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white hover:bg-[#124936]"
            >
              Generate Draft
            </Button>
          </form>

          <form action={finalizeAction} className="ml-auto">
            <input type="hidden" name="academic_year_id" value={yearId} />
            <Button
              type="submit"
              variant="outline"
              disabled={isFinalizing || isGenerating || !canManage}
              className="h-10 rounded-[9px] border border-[#d7e6dc] bg-white px-4 text-[11px] font-bold text-[#4b8669] hover:border-[#9bc5a8] hover:bg-[#f4faf5]"
            >
              <CheckCircle2Icon data-icon="inline-start" className="size-4" />
              Finalisasi Draft
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

function ManualPlacementCard({
  yearId,
  yearClasses,
  onMessage,
  canManage,
}: {
  yearId: string;
  yearClasses: SchoolClass[];
  onMessage: (message: string) => void;
  canManage: boolean;
}) {
  const [state, formAction, isSubmitting] = useActionState<FormState, FormData>(
    savePlacement,
    undefined
  );
  const [unplaced, setUnplaced] = useState<UnplacedStudent[] | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Loading diturunkan dari data, bukan setState sinkron di dalam effect.
  const isLoading = unplaced === null;

  const loadUnplaced = useCallback(() => {
    // SetState di dalam callback promise, bukan langsung di body effect.
    void fetchUnplaced(yearId).then((result) => {
      if (result.ok) {
        setUnplaced(result.data);
      } else {
        toast.error(result.error);
        setUnplaced([]);
      }
    });
  }, [yearId]);

  useEffect(() => {
    void loadUnplaced();
  }, [loadUnplaced]);

  useEffect(() => {
    if (state?.success) {
      onMessage(state.success);
      // Reset form (termasuk select siswa) via DOM, bukan setState.
      formRef.current?.reset();
      void loadUnplaced();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, onMessage, loadUnplaced]);

  return (
    <Card className="border-[#e2ece5] shadow-[0_3px_7px_#1c443305]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-[#21483b]">
          <UserPlusIcon data-icon="inline-start" className="size-4" />
          Penempatan Manual
        </CardTitle>
        <CardDescription className="text-[#8b9f95]">
          Tempatkan siswa satu per satu. Sistem menolak jika kelas penuh atau tahun ajaran tidak sesuai.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form
          ref={formRef}
          action={formAction}
          className="flex flex-wrap items-end gap-3 px-6 pb-5"
        >
          <input type="hidden" name="academic_year_id" value={yearId} />
          <input type="hidden" name="status" value="active" />
          <input type="hidden" name="placement_status" value="final" />
          <input
            type="hidden"
            name="enrollment_date"
            value={new Date().toISOString().slice(0, 10)}
          />
          <div className="min-w-[220px] space-y-2">
            <FieldLabel htmlFor="placement-student" required>
              Siswa
            </FieldLabel>
            <select
              id="placement-student"
              name="student_id"
              className={SELECT_CLASS}
              required
              disabled={isLoading}
            >
              <option value="">
                {isLoading ? "- memuat siswa -" : "- pilih siswa -"}
              </option>
              {(unplaced ?? []).map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nama_lengkap}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px] space-y-2">
            <FieldLabel htmlFor="placement-class" required>
              Kelas
            </FieldLabel>
            <select id="placement-class" name="class_id" className={SELECT_CLASS} required>
              <option value="">- pilih kelas -</option>
              {yearClasses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.capacity !== null ? ` (${item.capacity} siswa)` : ""}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !canManage}
            className="h-10 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white hover:bg-[#124936]"
          >
            Tempatkan
          </Button>
        </form>

        {unplaced && unplaced.length === 0 ? (
          <p className="px-6 pb-5 text-xs text-[#8b9f95]">
            Semua siswa aktif sudah ditempatkan pada tahun ajaran ini.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}