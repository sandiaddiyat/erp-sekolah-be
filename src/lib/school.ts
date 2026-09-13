import type { School, SchoolStatus } from "@/lib/types";

export const SCHOOL_STATUS_LABELS: Record<SchoolStatus, string> = {
  trial: "Uji Coba",
  active: "Aktif",
  suspended: "Suspend",
};

export type SubscriptionProblem = "suspended" | "expired" | null;

/**
 * Alasan sekolah tidak boleh dipakai. `null` berarti aman.
 * `active_until` kosong berarti tanpa batas waktu.
 */
export function subscriptionProblem(
  school: School | null
): SubscriptionProblem {
  if (!school) return null;
  if (school.status === "suspended") return "suspended";
  if (school.active_until) {
    const endOfDay = new Date(`${school.active_until}T23:59:59`);
    if (!Number.isNaN(endOfDay.getTime()) && endOfDay.getTime() < Date.now()) {
      return "expired";
    }
  }
  return null;
}

export function daysUntilActiveEnd(school: School | null): number | null {
  if (!school?.active_until) return null;
  const endOfDay = new Date(`${school.active_until}T23:59:59`);
  if (Number.isNaN(endOfDay.getTime())) return null;
  return Math.ceil((endOfDay.getTime() - Date.now()) / 86_400_000);
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatActiveUntil(value: string | null): string {
  if (!value) return "Tanpa batas";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}
