export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Baca env yang wajib ada. Gagal cepat dengan pesan yang menyebut nama
 * variabelnya, bukan error `undefined` yang baru muncul saat runtime.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} belum diisi.`);
  }
  return value;
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "ERP Sekolah";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
