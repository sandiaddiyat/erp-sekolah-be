import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { getCombinedInvoicesReceiptRecord, renderReceipt } from "@/features/receipt-templates/service";
import { PrintReceiptButton } from "@/app/(app)/keuangan/kuitansi/[paymentId]/print/print-receipt-button";

export const metadata: Metadata = {
  title: { absolute: "Bukti Pembayaran" },
};

export default async function CombinedReceiptPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ invoices?: string }>;
}) {
  const current = await requirePermission(PERMISSIONS.financeView);
  const { invoices } = await searchParams;
  if (!invoices) notFound();

  const invoiceIds = invoices.split(",").map((id) => id.trim()).filter(Boolean);
  if (invoiceIds.length === 0) notFound();

  const receipt = await getCombinedInvoicesReceiptRecord(
    { supabase: await createClient() },
    current,
    invoiceIds
  );
  if (!receipt) notFound();

  const rendered = renderReceipt(receipt);
  return (
    <main className="receipt-print-page min-h-screen bg-[#f4f8f5] px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[760px] justify-end gap-2">
        <PrintReceiptButton />
      </div>
      <style dangerouslySetInnerHTML={{ __html: rendered.css }} />
      <style>{`
        @page { size: A4; margin: 12mm; }
        html, body { margin: 0; background: #ffffff; }
        .receipt-print-page { min-height: 100vh; }
        @media print {
          .receipt-print-page { min-height: auto; }
          .no-print { display: none !important; }
        }
      `}</style>
      <section dangerouslySetInnerHTML={{ __html: rendered.html }} />
    </main>
  );
}
