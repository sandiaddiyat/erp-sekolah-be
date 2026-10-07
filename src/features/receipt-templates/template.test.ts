import { describe, expect, it } from "vitest";
import { angkaTerbilang, renderReceiptTemplate, sanitizeReceiptHtml } from "@/features/receipt-templates/template";

describe("receipt template utilities", () => {
  it("mengganti placeholder dan meng-escape nilai", () => {
    const result = renderReceiptTemplate(
      { content_html: "<p>{{nama_siswa}}</p><p>{{nominal}}</p>", content_css: ".receipt{}" },
      { nama_siswa: "<Budi>", nominal: "Rp10.000" }
    );
    expect(result.html).toContain("&lt;Budi&gt;");
    expect(result.html).toContain("Rp10.000");
  });

  it("mempertahankan baris tabel rincian yang dibuat server", () => {
    const result = renderReceiptTemplate(
      { content_html: "<table><tbody>{{rincian_biaya}}</tbody></table>", content_css: "" },
      { rincian_biaya: "<tr><td>SPP</td></tr>" }
    );
    expect(result.html).toContain("<tr><td>SPP</td></tr>");
    expect(result.html).not.toContain("&lt;tr&gt;");
  });

  it("menghapus script, event handler, dan import CSS berbahaya", () => {
    expect(sanitizeReceiptHtml('<script>alert(1)</script><p onclick="alert(1)">A</p>')).toBe("<p>A</p>");
    expect(renderReceiptTemplate({ content_html: "<p>A</p>", content_css: '@import url("evil.css"); .receipt{color:red}' }, {}).css).toBe(".receipt{color:red}");
  });

  it.each([
    [0, "Nol Rupiah"],
    [1000, "Seribu Rupiah"],
    [600000, "Enam Ratus Ribu Rupiah"],
  ])("menghasilkan terbilang untuk %d", (value, expected) => {
    expect(angkaTerbilang(value)).toBe(expected);
  });
});
