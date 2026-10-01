import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { DiscountType, StudentDiscount, Siswa } from "@/lib/types";
import { DiskonClient } from "./diskon-client";

export const metadata = { title: "Diskon & Beasiswa" };

export default async function DiskonPage() {
  const current = await requirePermission(PERMISSIONS.discountView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [typesResult, discountsResult, studentsResult] = await Promise.all([
    supabase.from("discount_types").select("*").eq("school_id", schoolId).order("code"),
    supabase
      .from("student_discounts")
      .select("*, students!student_discounts_student_tenant_fkey!inner(nama_lengkap), discount_types!student_discounts_type_tenant_fkey(name)")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase.from("students").select("id, nama_lengkap, nisn").eq("school_id", schoolId).order("nama_lengkap"),
  ]);

  if (typesResult.error || discountsResult.error || studentsResult.error) {
    console.error("[diskon]", typesResult.error ?? discountsResult.error ?? studentsResult.error);
    return <DataError message="Gagal memuat data diskon." />;
  }

  return (
    <DiskonClient
      discountTypes={(typesResult.data ?? []) as unknown as DiscountType[]}
      studentDiscounts={(discountsResult.data ?? []) as unknown as StudentDiscount[]}
      students={(studentsResult.data ?? []) as unknown as Siswa[]}
      canManage={can(current.permissions, PERMISSIONS.discountManage, current.isSuperAdmin)}
    />
  );
}
