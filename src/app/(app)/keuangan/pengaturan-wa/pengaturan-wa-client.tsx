"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2Icon, MessageCircleIcon, SendIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import type { FormState, WhatsAppLog, WhatsAppSettings } from "@/lib/types";
import { defaultWhatsAppTemplates } from "@/features/whatsapp/service";
import { saveWhatsAppSettings, sendTestWhatsApp } from "./actions";

const INPUT_CLASS = "h-10 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";
const TEXTAREA_CLASS = "min-h-28 w-full rounded-[9px] border border-[#dfeae3] bg-white px-3 py-2.5 text-[11px] text-[#36584a] outline-none transition-colors placeholder:text-[#a8b7b0] focus-visible:border-[#78ad8a] focus-visible:ring-3 focus-visible:ring-[#4f9970]/10";
const PRIMARY_BUTTON = "h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-4 text-[11px] font-bold text-white shadow-[0_5px_12px_#18574326] hover:bg-[#124936]";
const OUTLINE_BUTTON = "h-8 rounded-[9px] border-[#e1ebe4] bg-white px-3 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]";

type Props = { settings: WhatsAppSettings | null; logs: WhatsAppLog[]; canManage: boolean };

export function WhatsAppSettingsClient({ settings, logs, canManage }: Props) {
  const [banner, setBanner] = useState<string | null>(null);
  const [saveState, saveAction, isSaving] = useActionState<FormState, FormData>(saveWhatsAppSettings, undefined);
  const [testState, testAction, isTesting] = useActionState<FormState, FormData>(sendTestWhatsApp, undefined);
  useEffect(() => { if (saveState?.success) setBanner(saveState.success); if (saveState?.error) toast.error(saveState.error); }, [saveState]);
  useEffect(() => { if (testState?.success) { setBanner(testState.success); } if (testState?.error) toast.error(testState.error); }, [testState]);
  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div>
        <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span>
        <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">WhatsApp & Notifikasi</h1>
        <p className="mt-2 text-xs text-[#82978d]">Atur gateway, template pesan, dan pantau riwayat notifikasi wali siswa.</p>
      </div>
      {banner ? <div className="rounded-[10px] border border-[#cbe5d0] bg-[#edf8ef] px-4 py-3 text-xs font-semibold text-[#27704e]">{banner}</div> : null}
      <Tabs defaultValue="konfigurasi" className="w-full">
        <TabsList variant="line" className="mb-5 w-full justify-start gap-5">
          <TabsTrigger value="konfigurasi">Konfigurasi</TabsTrigger>
          <TabsTrigger value="template">Template Pesan</TabsTrigger>
          <TabsTrigger value="log">Riwayat Pengiriman</TabsTrigger>
        </TabsList>
        <TabsContent value="konfigurasi">
          <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]"><CardHeader><CardTitle className="font-heading text-[15px] text-[#21483b]">Provider WhatsApp</CardTitle><CardDescription className="text-[11px] text-[#8b9f95]">Token disimpan di server dan tidak dikirim ke browser selain nilai formulir ini.</CardDescription></CardHeader><CardContent className="space-y-5"><form action={saveAction} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><FieldLabel htmlFor="provider" required>Provider</FieldLabel><select id="provider" name="provider" defaultValue={settings?.provider ?? "fonnte"} className={INPUT_CLASS}><option value="fonnte">Fonnte</option><option value="wablas">Wablas</option></select></div><div className="space-y-2"><FieldLabel htmlFor="sender_number" optional>Nomor pengirim</FieldLabel><Input id="sender_number" name="sender_number" defaultValue={settings?.sender_number ?? ""} placeholder="62812..." className={INPUT_CLASS} /></div></div>
            <div className="space-y-2"><FieldLabel htmlFor="api_token" required>API token</FieldLabel><Input id="api_token" name="api_token" type="password" defaultValue={settings?.api_token ?? ""} autoComplete="new-password" className={INPUT_CLASS} /></div>
            <div className="grid gap-3 sm:grid-cols-3">{[["is_active", "Aktifkan layanan", settings?.is_active ?? false], ["auto_send_receipt", "Kirim kuitansi otomatis", settings?.auto_send_receipt ?? true], ["auto_send_invoice", "Kirim tagihan otomatis", settings?.auto_send_invoice ?? false]].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-2 rounded-[9px] border border-[#e5eee8] bg-[#f7fbf8] p-3 text-[11px] font-medium text-[#36584a]"><input type="checkbox" name={String(name)} value="on" defaultChecked={Boolean(checked)} className="size-4 accent-[#185743]" />{String(label)}</label>)}</div>
            {canManage ? <Button type="submit" className={PRIMARY_BUTTON} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan pengaturan"}</Button> : null}
          </form><div className="border-t border-[#e5eee8] pt-5"><h3 className="font-heading text-[14px] text-[#24483b]">Kirim pesan uji coba</h3><p className="mt-1 text-[10px] text-[#93a49c]">Pastikan layanan aktif sebelum mengirim pesan.</p><form action={testAction} className="mt-3 flex flex-col gap-2 sm:flex-row"><Input name="phone" placeholder="Nomor WhatsApp admin, contoh 0812..." className={INPUT_CLASS} required />{canManage ? <Button type="submit" variant="outline" className={`${OUTLINE_BUTTON} shrink-0`} disabled={isTesting}><SendIcon className="mr-1.5 size-3.5" />{isTesting ? "Mengirim..." : "Kirim pesan uji coba"}</Button> : null}</form></div></CardContent></Card>
        </TabsContent>
        <TabsContent value="template"><Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]"><CardHeader><CardTitle className="font-heading text-[15px] text-[#21483b]">Template pesan</CardTitle><CardDescription className="text-[11px] text-[#8b9f95]">Gunakan variabel yang tersedia untuk mengisi pesan otomatis.</CardDescription></CardHeader><CardContent><form action={saveAction} className="space-y-5"><input type="hidden" name="provider" value={settings?.provider ?? "fonnte"} /><input type="hidden" name="api_token" value={settings?.api_token ?? ""} /><input type="hidden" name="sender_number" value={settings?.sender_number ?? ""} />{settings?.is_active ? <input type="hidden" name="is_active" value="true" /> : null}{settings?.auto_send_receipt ? <input type="hidden" name="auto_send_receipt" value="true" /> : null}{settings?.auto_send_invoice ? <input type="hidden" name="auto_send_invoice" value="true" /> : null}<div className="space-y-2"><FieldLabel htmlFor="template_invoice" required>Template tagihan</FieldLabel><Textarea id="template_invoice" name="template_invoice" defaultValue={settings?.template_invoice ?? defaultWhatsAppTemplates.invoice} className={TEXTAREA_CLASS} /></div><div className="space-y-2"><FieldLabel htmlFor="template_receipt" required>Template kuitansi</FieldLabel><Textarea id="template_receipt" name="template_receipt" defaultValue={settings?.template_receipt ?? defaultWhatsAppTemplates.receipt} className={TEXTAREA_CLASS} /></div><div className="rounded-[10px] border border-[#dbe8df] bg-[#f4faf6] p-3.5 text-[10px] leading-relaxed text-[#517a66]">Variabel: <code>{"{{nama_siswa}}"}</code>, <code>{"{{nama_tagihan}}"}</code>, <code>{"{{nominal}}"}</code>, <code>{"{{jatuh_tempo}}"}</code>, <code>{"{{tanggal_bayar}}"}</code>, <code>{"{{link_kuitansi}}"}</code>, <code>{"{{rekening_tujuan}}"}</code>.</div>{canManage ? <Button type="submit" className={PRIMARY_BUTTON} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan template"}</Button> : null}</form></CardContent></Card></TabsContent>
        <TabsContent value="log"><Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]"><CardHeader><CardTitle className="font-heading text-[15px] text-[#21483b]">Riwayat pengiriman</CardTitle><CardDescription className="text-[11px] text-[#8b9f95]">{logs.length} aktivitas terakhir.</CardDescription></CardHeader><CardContent className="px-0">{logs.length === 0 ? <div className="px-6 py-10 text-center text-xs text-[#a0afa8]">Belum ada pengiriman WhatsApp.</div> : <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b border-[#e5eee8] text-[10px] font-bold text-[#6c8279]"><th className="px-6 py-3">Tanggal</th><th className="px-3 py-3">Penerima</th><th className="px-3 py-3">Jenis</th><th className="px-3 py-3">Status</th><th className="px-6 py-3">Keterangan</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b border-[#f0f5f1] text-xs text-[#3e5c50]"><td className="px-6 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString("id-ID")}</td><td className="px-3 py-3">{log.recipient_name ?? log.recipient_phone}</td><td className="px-3 py-3">{log.message_type}</td><td className="px-3 py-3">{log.status === "sent" ? <Badge className="bg-[#e7f5e9] text-[#2b7254]"><CheckCircle2Icon className="mr-1 size-3" />Terkirim</Badge> : log.status === "failed" ? <Badge className="bg-[#fdf0ee] text-[#ad685d]"><XCircleIcon className="mr-1 size-3" />Gagal</Badge> : <Badge variant="outline"><MessageCircleIcon className="mr-1 size-3" />Menunggu</Badge>}</td><td className="px-6 py-3 text-[#82978d]">{log.error_message ?? "-"}</td></tr>)}</tbody></table></div>}</CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
