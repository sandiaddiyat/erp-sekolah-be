import { isIP } from "node:net";
import { headers } from "next/headers";

const VERCEL_FORWARDED_IP = "x-vercel-forwarded-for";
const DEVELOPMENT_IP = "127.0.0.1";

function normalizeIp(value: string): string | null {
  const candidate = value.trim();
  if (isIP(candidate) === 0) return null;

  try {
    const host = candidate.includes(":")
      ? `[${candidate}]`
      : candidate;
    return new URL(`http://${host}`).hostname
      .replace(/^\[|\]$/g, "")
      .toLowerCase();
  } catch {
    return candidate.toLowerCase();
  }
}

function firstValidIp(value: string | null): string | null {
  for (const candidate of value?.split(",") ?? []) {
    const normalized = normalizeIp(candidate);
    if (normalized) return normalized;
  }
  return null;
}

export function resolveClientIp(
  requestHeaders: Headers,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (env.NODE_ENV !== "production") {
    return DEVELOPMENT_IP;
  }
  if (env.VERCEL !== "1") {
    throw new Error("Rate limiter production hanya dikonfigurasi untuk Vercel.");
  }

  const forwardedIp = firstValidIp(requestHeaders.get(VERCEL_FORWARDED_IP));
  if (!forwardedIp) {
    throw new Error("Header IP Vercel tidak tersedia atau tidak valid.");
  }
  return forwardedIp;
}

export async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();
  return resolveClientIp(requestHeaders);
}
