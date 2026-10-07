import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { getReceiptRecord, renderReceipt } from "@/features/receipt-templates/service";
import { PrintReceiptButton } from "./print-receipt-button";

export const metadata = { title: "Cetak Kuitansi" };

export default async function ReceiptPrintPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const current = await requirePermission(PERMISSIONS.financeView);
  const { paymentId } = await params;
  const receipt = await getReceiptRecord({ supabase: await createClient() }, current, paymentId);
  if (!receipt) notFound();
  const rendered = renderReceipt(receipt);

  return (
    <main className="min-h-screen bg-[#f4f8f5] px-4 py-6 text-[#21483b] print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[760px] justify-end gap-2">
        <PrintReceiptButton />
      </div>
      <style dangerouslySetInnerHTML={{ __html: rendered.css }} />
      <section dangerouslySetInnerHTML={{ __html: rendered.html }} />
    </main>
  );
}
