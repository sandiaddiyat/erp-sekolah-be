import { DataError } from "@/components/data-error";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS, can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { DiscountType, StudentDiscount, Siswa, FeeCategory } from "@/lib/types";
import { DiskonClient } from "./diskon-client";

export const metadata = { title: "Diskon & Beasiswa" };

export default async function DiskonPage() {
  const current = await requirePermission(PERMISSIONS.discountView);
  const supabase = await createClient();
  const schoolId = current.profile.school_id ?? "";

  const [typesResult, discountsResult, studentsResult, categoriesResult] = await Promise.all([
    supabase.from("discount_types").select("*").eq("school_id", schoolId).order("code"),
    supabase
      .from("student_discounts")
      .select("*, students!inner(nama_lengkap), discount_types(name)")
      .eq("school_id", schoolId)
      .order("start_date", { ascending: false }),
    supabase.from("students").select("id, nama_lengkap, nisn").eq("school_id", schoolId).order("nama_lengkap"),
    supabase.from("fee_categories").select("id, name").eq("school_id", schoolId).order("name"),
  ]);

  if (typesResult.error || discountsResult.error || studentsResult.error || categoriesResult.error) {
    return <DataError message="Gagal memuat data diskon." />;
  }

  return (
    <DiskonClient
      discountTypes={(typesResult.data ?? []) as unknown as DiscountType[]}
      studentDiscounts={(discountsResult.data ?? []) as unknown as StudentDiscount[]}
      students={(studentsResult.data ?? []) as unknown as Siswa[]}
      feeCategories={(categoriesResult.data ?? []) as unknown as FeeCategory[]}
      canManage={can(current.permissions, PERMISSIONS.discountManage, current.isSuperAdmin)}
    />
  );
}
