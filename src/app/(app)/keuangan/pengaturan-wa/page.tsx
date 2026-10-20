import { DataError } from "@/components/data-error";
import { requirePermission, userCan } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import type { WhatsAppLog, WhatsAppSettings } from "@/lib/types";
import { getWhatsAppSettings } from "@/features/whatsapp/service";
import { WhatsAppSettingsClient } from "./pengaturan-wa-client";

export const metadata = { title: "WhatsApp & Notifikasi" };

export default async function WhatsAppSettingsPage() {
  const current = await requirePermission(PERMISSIONS.financeWhatsAppView);
  const schoolId = current.profile.school_id;
  if (!schoolId) {
    return <DataError message="Akun Anda tidak terhubung dengan sekolah aktif manapun." />;
  }

  const supabase = await createClient();
  const [settingsResult, logsResult] = await Promise.all([
    getWhatsAppSettings({ supabase }, schoolId),
    supabase.from("whatsapp_logs").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }).limit(100),
  ]);

  if (logsResult.error) {
    console.error("[whatsapp-settings] logs error:", logsResult.error);
    const isMissingTable =
      logsResult.error.code === "42P01" ||
      logsResult.error.message?.includes("relation") ||
      logsResult.error.message?.includes("whatsapp_logs");
    if (isMissingTable) {
      return (
        <DataError message="Tabel WhatsApp belum dibuat di database. Silakan jalankan 'npm run db:setup' di terminal atau jalankan isi file supabase/migrations/0055_whatsapp_gateway.sql di Supabase SQL Editor." />
      );
    }
    return <DataError message="Gagal memuat riwayat WhatsApp." />;
  }

  return (
    <WhatsAppSettingsClient
      settings={settingsResult}
      logs={(logsResult.data ?? []) as WhatsAppLog[]}
      canManage={userCan(current, PERMISSIONS.financeWhatsAppManage)}
    />
  );
}
