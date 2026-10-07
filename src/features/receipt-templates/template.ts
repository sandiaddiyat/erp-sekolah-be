import type { ReceiptTemplate } from "@/lib/types";

export const DEFAULT_RECEIPT_TEMPLATE = {
  name: "Template Kuitansi Standar",
  content_html: '<div class="receipt"><header><img data-receipt-logo alt="Logo sekolah"><div><h1>{{nama_sekolah}}</h1><p>{{alamat_sekolah}}</p><p>{{telepon_sekolah}}</p></div></header><div class="receipt-title"><h2>BUKTI PEMBAYARAN</h2><p>No. {{nomor_kuitansi}}</p></div><section class="identity"><p><strong>Nama Siswa</strong><span>{{nama_siswa}}</span></p><p><strong>Nomor Induk</strong><span>{{nomor_induk}}</span></p><p><strong>Kelas</strong><span>{{kelas}}</span></p><p><strong>Diterima Dari</strong><span>{{metode_pembayaran}}</span></p><p><strong>Tanggal Bayar</strong><span>{{tanggal_bayar}}</span></p></section><table><thead><tr><th>No</th><th>Jenis Biaya</th><th>Nominal</th></tr></thead><tbody>{{rincian_biaya}}</tbody><tfoot><tr><th colspan="2">Total Pembayaran</th><th>{{nominal}}</th></tr></tfoot></table><p class="terbilang">Terbilang: <strong># {{terbilang}} #</strong></p><footer><p>{{kota}}, {{tanggal_bayar}}</p><p>Kasir / Penerima,<br><br><strong>{{nama_petugas}}</strong></p></footer></div>',
  content_css: '.receipt{width:100%;max-width:760px;margin:0 auto;padding:32px;color:#21483b;font-family:Arial,sans-serif;font-size:13px}.receipt header{display:flex;gap:18px;align-items:center;border-bottom:2px solid #185743;padding-bottom:18px}.receipt header img{width:64px;height:64px;object-fit:contain}.receipt h1{margin:0;font-size:22px;color:#183d32}.receipt h2{margin:0;color:#185743;font-size:18px}.receipt p{margin:4px 0}.receipt-title{display:flex;justify-content:space-between;align-items:end;padding:22px 0 14px}.identity{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;border:1px solid #dfeae3;padding:14px;margin-bottom:18px}.identity p{display:flex;justify-content:space-between;gap:12px}.identity strong{color:#6c8279;font-size:11px}.receipt table{width:100%;border-collapse:collapse}.receipt th,.receipt td{border-bottom:1px solid #dfeae3;padding:10px 8px;text-align:left}.receipt th:last-child,.receipt td:last-child{text-align:right}.receipt tfoot th{border-top:2px solid #185743;border-bottom:0}.terbilang{margin-top:18px;padding:12px;background:#f4faf5}.receipt footer{display:flex;justify-content:space-between;text-align:center;margin-top:48px}@media print{.receipt{max-width:none;padding:0}.no-print{display:none!important}}',
} satisfies Pick<ReceiptTemplate, "name" | "content_html" | "content_css">;

export const RECEIPT_PLACEHOLDERS = [
  "{{nama_sekolah}}", "{{alamat_sekolah}}", "{{telepon_sekolah}}", "{{nomor_kuitansi}}",
  "{{nama_siswa}}", "{{nomor_induk}}", "{{kelas}}", "{{tanggal_bayar}}", "{{metode_pembayaran}}",
  "{{nominal}}", "{{terbilang}}", "{{rincian_biaya}}", "{{nama_petugas}}", "{{kota}}",
];

export function sanitizeReceiptHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button|link|meta|base)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, "$1=$2#$2");
}

export function sanitizeReceiptCss(css: string): string {
  return css
    .replace(/@import[^;]+;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*javascript:[^)]*\)/gi, "")
    .trim();
}

export function renderReceiptTemplate(
  template: Pick<ReceiptTemplate, "content_html" | "content_css">,
  values: Record<string, string>
) {
  let html = sanitizeReceiptHtml(template.content_html);
  for (const [key, value] of Object.entries(values)) {
    html = html.replaceAll(`{{${key}}}`, key === "rincian_biaya" ? value : escapeHtml(value));
  }
  if (values.logo_url) {
    html = html.replace(/<img([^>]*data-receipt-logo[^>]*)>/gi, `<img$1 src="${escapeHtml(values.logo_url)}">`);
  }
  return { html, css: sanitizeReceiptCss(template.content_css) };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

const WORDS = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

export function angkaTerbilang(value: number): string {
  const amount = Math.floor(Math.abs(value));
  if (!Number.isFinite(amount)) return "Nol Rupiah";
  const spell = (number: number): string => {
    if (number < 12) return WORDS[number] ?? "";
    if (number < 20) return `${spell(number - 10)} Belas`;
    if (number < 100) return `${spell(Math.floor(number / 10))} Puluh ${spell(number % 10)}`.trim();
    if (number < 200) return `Seratus ${spell(number - 100)}`.trim();
    if (number < 1000) return `${spell(Math.floor(number / 100))} Ratus ${spell(number % 100)}`.trim();
    if (number < 2000) return `Seribu ${spell(number - 1000)}`.trim();
    if (number < 1_000_000) return `${spell(Math.floor(number / 1000))} Ribu ${spell(number % 1000)}`.trim();
    if (number < 1_000_000_000) return `${spell(Math.floor(number / 1_000_000))} Juta ${spell(number % 1_000_000)}`.trim();
    if (number < 1_000_000_000_000) return `${spell(Math.floor(number / 1_000_000_000))} Miliar ${spell(number % 1_000_000_000)}`.trim();
    return `${spell(Math.floor(number / 1_000_000_000_000))} Triliun ${spell(number % 1_000_000_000_000)}`.trim();
  };
  return `${spell(amount) || "Nol"} Rupiah`;
}
