import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { Bill, BillItem, BillWithStudent, Payment } from "@/lib/types";
import { KeuanganClient } from "./keuangan-client";

export const metadata = { title: "SPP & Keuangan" };

export type StudentOption = { id: string; nama_lengkap: string };

export default async function KeuanganPage() {
  const current = await requirePermission(PERMISSIONS.financeView);
  const supabase = await createClient();

  const [billsResult, itemsResult, studentsResult, paymentsResult] =
    await Promise.all([
      supabase
        .from("bills")
        .select(
          "id, school_id, student_id, bill_item_id, deskripsi, nominal, jatuh_tempo, status, students(nama_lengkap)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("bill_items")
        .select("id, nama_item, nominal, frekuensi")
        .order("nama_item"),
      supabase.from("students").select("id, nama_lengkap").order("nama_lengkap"),
      supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const loadError =
    billsResult.error ?? itemsResult.error ?? studentsResult.error ?? paymentsResult.error;
  if (loadError) {
    return <DataError message="Gagal memuat data keuangan." />;
  }

  type BillRow = Omit<Bill, "student_nama"> & {
    students: { nama_lengkap: string } | { nama_lengkap: string }[] | null;
  };

  const bills = (billsResult.data ?? []) as unknown as BillRow[];
  const billItems = (itemsResult.data ?? []) as BillItem[];
  const students = (studentsResult.data ?? []) as StudentOption[];
  const payments = (paymentsResult.data ?? []) as Payment[];

  const billsWithStudent: BillWithStudent[] = bills.map((bill) => {
    const student = Array.isArray(bill.students) ? bill.students[0] : bill.students;
    return {
      id: bill.id,
      school_id: bill.school_id,
      student_id: bill.student_id,
      bill_item_id: bill.bill_item_id,
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
      billItems={billItems}
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
