import { headers } from "next/headers";
import { Redis } from "@upstash/redis";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const RESERVATION_MS = 30_000;
const RESERVATION_CLEANUP_MS = 60_000;

type Attempt = { count: number; firstAttemptAt: number; blockedUntil: number };

let memoryAttempts = new Map<string, Attempt>();
let reservationTokens = new Map<string, string>();
let reservationEmails = new Map<string, number>();
let lastReservationCleanup = 0;

if (process.env.NODE_ENV === "test") {
  // Allow tests to reset in-memory state between test files.
  (globalThis as unknown as { __rateLimitReset?: () => void }).__rateLimitReset =
    () => {
      memoryAttempts = new Map();
      reservationTokens = new Map();
      reservationEmails = new Map();
      lastReservationCleanup = 0;
    };
}

function normalizeIp(ip: string): string {
  return ip.replace(/\s+/g, "").toLowerCase();
}

export function isMemoryRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedis(): Redis | null {
  if (!isMemoryRedisConfigured()) return null;
  if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function clientIp(): Promise<string> {
  const h = await headers();

  if (process.env.VERCEL === "1") {
    const forwarded = h.get("x-vercel-forwarded-for");
    if (forwarded) {
      return normalizeIp(forwarded.split(",")[0].trim()) || "unknown";
    }
    return "unknown";
  }

  const forwarded = h.get("x-forwarded-for");
  return normalizeIp(forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown");
}

async function getAttempt(redis: Redis | null, key: string): Promise<Attempt | undefined> {
  if (redis) {
    const raw = await redis.get<string>(`rl:${key}`);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Attempt;
    } catch {
      return undefined;
    }
  }
  return memoryAttempts.get(key);
}

async function setAttempt(redis: Redis | null, key: string, attempt: Attempt): Promise<void> {
  if (redis) {
    await redis.set(`rl:${key}`, JSON.stringify(attempt), { ex: Math.ceil(WINDOW_MS / 1000) + 1 });
    return;
  }
  memoryAttempts.set(key, attempt);
}

async function deleteAttempt(redis: Redis | null, key: string): Promise<void> {
  if (redis) {
    await redis.del(`rl:${key}`);
    return;
  }
  memoryAttempts.delete(key);
}

async function incrAttempt(redis: Redis | null, key: string): Promise<number> {
  if (redis) {
    const windowSec = Math.ceil(WINDOW_MS / 1000);
    const result = await redis.incr(`rl:attempt:${key}`);
    if (result === 1) {
      await redis.expire(`rl:attempt:${key}`, windowSec);
    }
    return result;
  }
  const entry = memoryAttempts.get(key);
  if (!entry) {
    memoryAttempts.set(key, { count: 1, firstAttemptAt: Date.now(), blockedUntil: 0 });
    return 1;
  }
  if (Date.now() - entry.firstAttemptAt > WINDOW_MS) {
    memoryAttempts.set(key, { count: 1, firstAttemptAt: Date.now(), blockedUntil: 0 });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

async function getInFlight(redis: Redis | null, key: string): Promise<number> {
  if (redis) {
    const raw = await redis.get<string>(`rl:in_flight:${key}`);
    return raw ? parseInt(raw, 10) : 0;
  }
  return reservationEmails.get(key) ?? 0;
}

async function setInFlight(redis: Redis | null, key: string, value: number): Promise<void> {
  if (redis) {
    if (value <= 0) {
      await redis.del(`rl:in_flight:${key}`);
    } else {
      await redis.set(`rl:in_flight:${key}`, value.toString(), { ex: Math.ceil(WINDOW_MS / 1000) + 1 });
    }
  } else if (value <= 0) {
    reservationEmails.delete(key);
  } else {
    reservationEmails.set(key, value);
  }
}

async function setReservation(redis: Redis | null, key: string, token: string): Promise<void> {
  if (redis) {
    await redis.set(`rl:res:${key}`, token, { ex: Math.ceil(RESERVATION_MS / 1000) });
  } else {
    reservationTokens.set(key, token);
  }
}

async function getReservation(redis: Redis | null, key: string): Promise<string | undefined> {
  if (redis) {
    return redis.get<string>(`rl:res:${key}`) ?? undefined;
  }
  return reservationTokens.get(key);
}

async function deleteReservation(redis: Redis | null, key: string): Promise<void> {
  if (redis) {
    await redis.del(`rl:res:${key}`);
  } else {
    reservationTokens.delete(key);
  }
}

function generateToken(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function cleanupExpiredReservations(redis: Redis | null): Promise<void> {
  const now = Date.now();
  if (now - lastReservationCleanup < RESERVATION_CLEANUP_MS) return;
  lastReservationCleanup = now;

  if (redis) {
    const keys = await redis.keys("rl:res:*");
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -2 || ttl === -1) {
        await redis.del(key);
      }
    }
  } else {
    for (const [key, token] of reservationTokens) {
      const parts = token.split("-");
      const ts = parseInt(parts[0], 10);
      if (isNaN(ts) || now - ts > RESERVATION_MS) {
        reservationTokens.delete(key);
      }
    }
  }
}

export async function beginAttempt(email: string, ip: string): Promise<{ attemptId: string; blocked: boolean }> {
  await cleanupExpiredReservations(null);

  const emailKey = `email:${email.toLowerCase().trim()}`;
  const ipKey = `ip:${normalizeIp(ip)}`;

  const redis = getRedis();

  const emailInFlight = await getInFlight(redis, emailKey);
  const ipInFlight = await getInFlight(redis, ipKey);

  if (emailInFlight >= MAX_ATTEMPTS || ipInFlight >= MAX_ATTEMPTS) {
    return { attemptId: "", blocked: true };
  }

  const attemptId = generateToken();
  await setReservation(redis, emailKey, attemptId);
  await setReservation(redis, ipKey, attemptId);
  await setInFlight(redis, emailKey, emailInFlight + 1);
  await setInFlight(redis, ipKey, ipInFlight + 1);

  return { attemptId, blocked: false };
}

export async function recordFailure(attemptId: string, email: string, ip: string): Promise<void> {
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const ipKey = `ip:${normalizeIp(ip)}`;

  const redis = getRedis();

  const emailReservation = await getReservation(redis, emailKey);
  const ipReservation = await getReservation(redis, ipKey);

  if (emailReservation !== attemptId || ipReservation !== attemptId) {
    return;
  }

  await incrAttempt(redis, emailKey);
  await incrAttempt(redis, ipKey);

  const emailCount = await getInFlight(redis, emailKey);
  const ipCount = await getInFlight(redis, ipKey);

  if (emailCount >= MAX_ATTEMPTS || ipCount >= MAX_ATTEMPTS) {
    const blockedUntil = Date.now() + BLOCK_MS;
    await setAttempt(redis, emailKey, { count: MAX_ATTEMPTS, firstAttemptAt: Date.now(), blockedUntil });
    await setAttempt(redis, ipKey, { count: MAX_ATTEMPTS, firstAttemptAt: Date.now(), blockedUntil });
  }

  await deleteReservation(redis, emailKey);
  await deleteReservation(redis, ipKey);
}

export async function recordSuccess(attemptId: string, email: string, ip: string): Promise<void> {
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const ipKey = `ip:${normalizeIp(ip)}`;

  const redis = getRedis();

  const emailReservation = await getReservation(redis, emailKey);
  const ipReservation = await getReservation(redis, ipKey);

  if (emailReservation !== attemptId || ipReservation !== attemptId) {
    return;
  }

  await deleteAttempt(redis, emailKey);
  await deleteAttempt(redis, ipKey);
  await setInFlight(redis, emailKey, 0);
  await setInFlight(redis, ipKey, 0);
  await deleteReservation(redis, emailKey);
  await deleteReservation(redis, ipKey);
}

export async function isBlocked(email: string, ip: string): Promise<boolean> {
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const ipKey = `ip:${normalizeIp(ip)}`;

  const redis = getRedis();

  for (const key of [emailKey, ipKey]) {
    const entry = await getAttempt(redis, key);
    if (entry && entry.blockedUntil > Date.now()) {
      return true;
    }
  }

  return false;
}

export async function clearSession(email: string, ip: string): Promise<void> {
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const ipKey = `ip:${normalizeIp(ip)}`;

  const redis = getRedis();

  await deleteAttempt(redis, emailKey);
  await deleteAttempt(redis, ipKey);
  await setInFlight(redis, emailKey, 0);
  await setInFlight(redis, ipKey, 0);
  await deleteReservation(redis, emailKey);
  await deleteReservation(redis, ipKey);
}
