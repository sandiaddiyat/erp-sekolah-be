import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Bill, BillWithStudent, FeeStructureOption, Payment } from "@/lib/types";
import { KeuanganClient } from "./keuangan-client";

export const metadata = { title: "SPP & Keuangan" };

export type StudentOption = { id: string; nama_lengkap: string };

type FeeStructureOptionData = {
  id: string;
  amount: number;
  due_day: number | null;
  fee_categories: { name: string } | null;
  grades: { name: string } | null;
  academic_years: { name: string } | null;
};

export default async function KeuanganPage() {
  const current = await requirePermission(PERMISSIONS.financeView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [billsResult, structuresResult, studentsResult, paymentsResult] =
    await Promise.all([
      supabase
        .from("bills")
        .select(
          "id, school_id, student_id, fee_structure_id, deskripsi, nominal, diskon, diskon_keterangan, jatuh_tempo, status, students!bills_student_tenant_fkey(nama_lengkap)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("fee_structures")
        .select(
          "id, amount, due_day, fee_categories!fee_structures_category_tenant_fkey(name), grades!fee_structures_grade_tenant_fkey(name), academic_years!fee_structures_year_tenant_fkey(name)"
        )
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      supabase.from("students")
        .select("id, nama_lengkap")
        .eq("school_id", schoolId)
        .order("nama_lengkap"),
      supabase
        .from("payments")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
    ]);

  const loadError =
    billsResult.error ?? structuresResult.error ?? studentsResult.error ?? paymentsResult.error;
  if (loadError) {
    console.error("[keuangan]", loadError);
    return <DataError message="Gagal memuat data keuangan." />;
  }

  type BillRow = Omit<Bill, "student_nama"> & {
    students: { nama_lengkap: string } | { nama_lengkap: string }[] | null;
  };

  const bills = (billsResult.data ?? []) as unknown as BillRow[];
  const feeStructures = (structuresResult.data ?? []) as unknown as FeeStructureOptionData[];
  const students = (studentsResult.data ?? []) as StudentOption[];
  const payments = (paymentsResult.data ?? []) as Payment[];

  // Petakan hasil fee_structures ke format FeeStructureOption[]
  const feeStructureOptions: FeeStructureOption[] = feeStructures.map((fs) => ({
    id: fs.id,
    category_name: fs.fee_categories?.name ?? "",
    amount: Number(fs.amount),
    grade_name: fs.grades?.name ?? null,
    academic_year_name: fs.academic_years?.name ?? null,
    due_day: fs.due_day ?? null,
  }));

  const billsWithStudent: BillWithStudent[] = bills.map((bill) => {
    const student = Array.isArray(bill.students) ? bill.students[0] : bill.students;
    return {
      id: bill.id,
      school_id: bill.school_id,
      student_id: bill.student_id,
      bill_item_id: bill.bill_item_id,
      fee_structure_id: bill.fee_structure_id,
      deskripsi: bill.deskripsi,
      nominal: bill.nominal,
      diskon: bill.diskon,
      diskon_keterangan: bill.diskon_keterangan,
      jatuh_tempo: bill.jatuh_tempo,
      status: bill.status as Bill["status"],
      student_nama: student?.nama_lengkap ?? null,
    };
  });

  return (
    <KeuanganClient
      bills={billsWithStudent}
      feeStructures={feeStructureOptions}
      students={students}
      payments={payments}
      permissions={{
        billCreate: can(current.permissions, PERMISSIONS.financeBillCreate, current.isSuperAdmin),
        paymentCreate: can(current.permissions, PERMISSIONS.financePaymentCreate, current.isSuperAdmin),
        verify: can(current.permissions, PERMISSIONS.financePaymentVerify, current.isSuperAdmin),
      }}
    />
  );
}
