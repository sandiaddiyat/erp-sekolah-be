/**
 * Ubah teks menjadi slug yang aman dipakai sebagai identifier.
 * Bagian kosong dirapikan sehingga tidak ada pemisah di awal/akhir
 * atau pemisah berganda.
 */
export function slugify(
  value: string,
  separator = "_",
  fallback = "item"
): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, separator)
    .slice(0, 50);

  const cleaned = slug.split(separator).filter(Boolean).join(separator);

  return cleaned || fallback;
}
