"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FieldLabel } from "@/features/pegawai/FieldLabel";
import type { FormState, ReceiptTemplate } from "@/lib/types";
import { RECEIPT_PLACEHOLDERS } from "@/features/receipt-templates/template";
import { deleteReceiptTemplate, saveReceiptTemplate } from "@/features/receipt-templates/actions";

const PRIMARY_BUTTON = "h-9 rounded-[9px] border border-[#185743] bg-[#185743] px-3.5 text-[11px] font-bold text-white shadow-[0_5px_12px_rgb(24_87_67/15%)] hover:bg-[#124936]";
const OUTLINE_BUTTON = "h-8 rounded-[9px] border-[#e1ebe4] bg-white px-2.5 text-[10px] font-bold text-[#537467] shadow-none hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#537467]";

export function ReceiptSettingsClient({ templates, canManage }: { templates: ReceiptTemplate[]; canManage: boolean }) {
  const [editing, setEditing] = useState<ReceiptTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<ReceiptTemplate | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1190px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="mb-2.5 block text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.05em] text-[#183d32]">Pengaturan Kuitansi</h1>
          <p className="mt-2 text-xs text-[#82978d]">Atur layout bukti pembayaran yang dipakai saat mencetak kuitansi.</p>
        </div>
        {canManage && <Button className={`${PRIMARY_BUTTON} gap-2`} onClick={() => { setEditing(null); setOpen(true); }}><PlusIcon className="size-4" />Tambah Template</Button>}
      </div>

      <Card className="rounded-[15px] border-[#e2ece5] shadow-[0_3px_7px_#1c443302]">
        <CardHeader>
          <CardTitle className="text-base text-[#21483b]">Template kuitansi sekolah</CardTitle>
          <CardDescription className="text-xs text-[#82978d]">Template default dipakai pada halaman cetak pembayaran terverifikasi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#cbded0] px-4 py-8 text-center text-xs text-[#82978d]">Belum ada template kuitansi.</div>
          ) : templates.map((template) => (
            <div key={template.id} className="flex flex-col gap-3 rounded-[10px] border border-[#e1ebe4] bg-[#fbfdfb] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="text-sm font-semibold text-[#21483b]">{template.name}</p>{template.is_default && <Badge className="bg-[#e7f3ea] text-[10px] text-[#2b7254] hover:bg-[#e7f3ea]">Default</Badge>}</div>
                <p className="mt-1 text-xs text-[#82978d]">Diperbarui {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(template.updated_at))}</p>
              </div>
              {canManage && <div className="flex gap-2"><Button variant="ghost" size="icon-sm" aria-label="Ubah template" className="border border-[#e1ebe4] bg-white text-[#537467] hover:border-[#b8d6c0] hover:bg-[#f4faf5] hover:text-[#2b7254]" onClick={() => { setEditing(template); setOpen(true); }}><PencilIcon className="size-4" /></Button>{!template.is_default && <Button variant="ghost" size="icon-sm" aria-label="Hapus template" className="border border-[#ead6d1] bg-white text-[#ad685d] hover:border-[#e8bcb4] hover:bg-[#fff7f5] hover:text-[#ad685d]" onClick={() => setDeleting(template)}><Trash2Icon className="size-4" /></Button>}</div>}
            </div>
          ))}
        </CardContent>
      </Card>

      <ReceiptTemplateDialog key={editing?.id ?? "new"} open={open} onOpenChange={setOpen} editing={editing} />
      <DeleteTemplateDialog template={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function ReceiptTemplateDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (open: boolean) => void; editing: ReceiptTemplate | null }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(saveReceiptTemplate, undefined);
  useEffect(() => {
    if (state?.success) { toast.success(state.success); onOpenChange(false); }
    if (state?.error) toast.error(state.error);
  }, [state, onOpenChange]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,900px)] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden rounded-[15px] border-[#e2ece5] bg-[#fbfdfb] p-0">
        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-[#e5eee8] bg-white px-7 pb-5 pt-6 text-left"><span className="text-[10px] font-bold tracking-[0.1em] text-[#4c9a77] uppercase">Keuangan</span><DialogTitle className="font-heading text-xl tracking-[-0.04em] text-[#183d32]">{editing ? "Ubah template kuitansi" : "Tambah template kuitansi"}</DialogTitle><DialogDescription className="text-xs text-[#82978d]">Gunakan placeholder yang tersedia untuk mengisi data pembayaran saat dicetak.</DialogDescription></DialogHeader>
          {editing?.id && <input type="hidden" name="id" value={editing.id} />}
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><div className="space-y-2"><FieldLabel htmlFor="receipt-template-name" required>Nama Template</FieldLabel><Input id="receipt-template-name" name="name" defaultValue={editing?.name ?? ""} placeholder="Template Kuitansi SPP" required className="h-10 rounded-[9px] border-[#dfeae3] text-xs" /></div><label className="flex h-10 items-center gap-2 rounded-[9px] border border-[#dfeae3] bg-white px-3 text-xs text-[#537467]"><input type="checkbox" name="is_default" defaultChecked={editing?.is_default ?? false} /> Jadikan default</label></div>
            <div className="grid gap-5 lg:grid-cols-2"><div className="space-y-2"><FieldLabel htmlFor="receipt-template-html" required>HTML Template</FieldLabel><Textarea id="receipt-template-html" name="content_html" defaultValue={editing?.content_html ?? ""} className="min-h-[360px] rounded-[9px] border-[#dfeae3] font-mono text-xs leading-5" required /></div><div className="space-y-2"><FieldLabel htmlFor="receipt-template-css" optional>CSS Template</FieldLabel><Textarea id="receipt-template-css" name="content_css" defaultValue={editing?.content_css ?? ""} className="min-h-[360px] rounded-[9px] border-[#dfeae3] font-mono text-xs leading-5" /><div className="rounded-[9px] border border-[#dfeae3] bg-white p-3"><p className="mb-2 text-[10px] font-bold text-[#537467]">Placeholder tersedia</p><div className="flex flex-wrap gap-1.5">{RECEIPT_PLACEHOLDERS.map((placeholder) => <code key={placeholder} className="rounded bg-[#f4faf5] px-1.5 py-1 text-[10px] text-[#2b7254]">{placeholder}</code>)}</div></div></div></div>
          </div>
          <DialogFooter className="mx-0 mb-0 shrink-0 justify-end gap-2 rounded-none border-t border-[#e3ece6] bg-white p-0 px-7 py-[15px] sm:justify-end"><Button type="button" variant="outline" className={OUTLINE_BUTTON} onClick={() => onOpenChange(false)}>Batal</Button><Button type="submit" className={PRIMARY_BUTTON} disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan Template"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTemplateDialog({ template, onClose }: { template: ReceiptTemplate | null; onClose: () => void }) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(deleteReceiptTemplate, undefined);
  useEffect(() => { if (state?.success) { toast.success(state.success); onClose(); } if (state?.error) toast.error(state.error); }, [state, onClose]);
  return <Dialog open={Boolean(template)} onOpenChange={(open) => !open && onClose()}><DialogContent className="rounded-[15px] border-[#e2ece5]"><form action={formAction}><DialogHeader><DialogTitle className="text-[#183d32]">Hapus template?</DialogTitle><DialogDescription className="text-xs text-[#82978d]">Template {template?.name} akan dihapus dan tidak dapat digunakan lagi.</DialogDescription></DialogHeader><input type="hidden" name="id" value={template?.id ?? ""} /><DialogFooter><Button type="button" variant="outline" className={OUTLINE_BUTTON} onClick={onClose}>Batal</Button><Button type="submit" className="h-8 rounded-[9px] bg-[#ad685d] px-3 text-[10px] font-bold text-white hover:bg-[#8f5048]" disabled={isPending}>{isPending ? "Menghapus..." : "Hapus"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
