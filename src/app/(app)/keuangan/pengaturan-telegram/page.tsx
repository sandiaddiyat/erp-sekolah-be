import { DataError } from "@/components/data-error";
import { requirePermission, userCan } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { TelegramLog } from "@/lib/types";
import { getTelegramSettings } from "@/features/telegram/service";
import { TelegramSettingsClient } from "./pengaturan-telegram-client";

export const metadata = { title: "Telegram Bot" };

export default async function TelegramSettingsPage() {
  const current = await requirePermission(PERMISSIONS.financeTelegramView);
  const schoolId = current.profile.school_id;
  if (!schoolId) return <DataError message="Akun Anda tidak terhubung dengan sekolah aktif manapun." />;
  const supabase = await createClient();
  const [settingsResult, logsResult] = await Promise.all([
    getTelegramSettings({ supabase }, schoolId),
    supabase.from("telegram_logs").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(100),
  ]);
  if (logsResult.error) {
    const isMissingTable = logsResult.error.code === "42P01" || logsResult.error.message?.includes("telegram_logs");
    return <DataError message={isMissingTable ? "Tabel Telegram belum dibuat di database. Jalankan migrasi supabase/migrations/0056_telegram_gateway.sql." : "Gagal memuat riwayat Telegram."} />;
  }
  const clientSettings = settingsResult ? { ...settingsResult, bot_token: "" } : null;
  return <TelegramSettingsClient settings={clientSettings} logs={(logsResult.data ?? []) as TelegramLog[]} canManage={userCan(current, PERMISSIONS.financeTelegramManage)} />;
}
