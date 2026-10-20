import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicReceipt } from "@/features/whatsapp/public-receipt";
import { PrintReceiptButton } from "@/app/(app)/keuangan/kuitansi/[paymentId]/print/print-receipt-button";

export const metadata: Metadata = { title: { absolute: "Kuitansi Pembayaran" } };

export default async function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getPublicReceipt({ supabase: createAdminClient() }, token);
  if (!result) notFound();
  return (
    <main className="receipt-print-page min-h-screen bg-[#f4f8f5] px-4 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[760px] justify-end"><PrintReceiptButton /></div>
      <style dangerouslySetInnerHTML={{ __html: result.rendered.css }} />
      <style>{`@page { size: A4; margin: 12mm; } html, body { margin: 0; background: #fff; } @media print { .no-print { display: none !important; } }`}</style>
      <section dangerouslySetInnerHTML={{ __html: result.rendered.html }} />
    </main>
  );
}
