import { createHash, randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

export const LOGIN_RATE_LIMIT_POLICY = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
  reservationMs: 60 * 1000,
} as const;

export type LoginIdentity = {
  email: string;
  ip: string;
};

export type LoginLimitDimension = "email" | "ip";

export type LoginLimitDecision = {
  blocked: boolean;
  dimension: LoginLimitDimension | null;
  retryAfterMs: number;
};

export type LoginAttempt = LoginLimitDecision & {
  attemptId: string | null;
};

export interface LoginFailureLimiter {
  beginAttempt(identity: LoginIdentity): Promise<LoginAttempt>;
  recordFailure(
    identity: LoginIdentity,
    attemptId: string
  ): Promise<LoginLimitDecision>;
  recordSuccess(identity: LoginIdentity, attemptId: string): Promise<void>;
  cancelAttempt(identity: LoginIdentity, attemptId: string): Promise<void>;
}

export type LoginRateLimitPolicy = {
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly blockMs: number;
  readonly reservationMs: number;
};

type RedisScript = {
  eval(keys: string[], args: string[]): Promise<unknown>;
};

type RedisClient = {
  createScript(script: string): RedisScript;
};

type MemoryAttempt = {
  count: number;
  firstFailureAt: number;
  blockedUntil: number;
  inFlight: Map<string, number>;
};

type MemoryStore = Map<string, MemoryAttempt>;

export class LoginRateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginRateLimitConfigurationError";
  }
}

const BEGIN_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max_failures = tonumber(ARGV[3])
local reservation_ms = tonumber(ARGV[4])
local token = ARGV[5]

local function cleanup(key)
  local fields = redis.call("HKEYS", key)
  local removed = 0
  for _, field in ipairs(fields) do
    if string.sub(field, 1, 8) == "attempt:" then
      local expires_at = tonumber(redis.call("HGET", key, field) or "0")
      if expires_at <= now then
        redis.call("HDEL", key, field)
        removed = removed + 1
      end
    end
  end
  if removed > 0 then
    local in_flight = tonumber(redis.call("HGET", key, "in_flight") or "0") - removed
    if in_flight < 0 then
      in_flight = 0
    end
    redis.call("HSET", key, "in_flight", in_flight)
  end
end

local function inspect(key)
  cleanup(key)
  local blocked_until = tonumber(redis.call("HGET", key, "blocked_until") or "0")
  if blocked_until > now then
    return true, blocked_until - now
  end

  if blocked_until > 0 then
    redis.call("HSET", key, "count", 0, "first_failure_at", 0, "blocked_until", 0)
  end

  local first_failure_at = tonumber(redis.call("HGET", key, "first_failure_at") or "0")
  if first_failure_at > 0 and now - first_failure_at >= window then
    redis.call("HSET", key, "count", 0, "first_failure_at", 0, "blocked_until", 0)
  end

  return false, 0
end

local email_blocked, email_retry = inspect(KEYS[1])
local ip_blocked, ip_retry = inspect(KEYS[2])
if email_blocked then
  return {1, 1, email_retry}
end
if ip_blocked then
  return {1, 2, ip_retry}
end

local function capacity(key)
  local count = tonumber(redis.call("HGET", key, "count") or "0")
  local in_flight = tonumber(redis.call("HGET", key, "in_flight") or "0")
  return count + in_flight
end

if capacity(KEYS[1]) >= max_failures then
  return {1, 1, reservation_ms}
end
if capacity(KEYS[2]) >= max_failures then
  return {1, 2, reservation_ms}
end

local expires_at = now + reservation_ms
for _, key in ipairs(KEYS) do
  local in_flight = tonumber(redis.call("HGET", key, "in_flight") or "0")
  redis.call("HSET", key, "in_flight", in_flight + 1)
  redis.call("HSET", key, "attempt:" .. token, expires_at)
  local first_failure_at = tonumber(redis.call("HGET", key, "first_failure_at") or "0")
  local key_expires_at = expires_at + window
  if first_failure_at > 0 and first_failure_at + window > key_expires_at then
    key_expires_at = first_failure_at + window
  end
  redis.call("PEXPIREAT", key, key_expires_at)
end

return {0, 0, 0}
`;

const FAILURE_SCRIPT = `
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max_failures = tonumber(ARGV[3])
local block_ms = tonumber(ARGV[4])
local token = ARGV[5]

local function consume(key)
  local field = "attempt:" .. token
  local expires_at = tonumber(redis.call("HGET", key, field) or "0")
  if expires_at == 0 then
    return false
  end
  redis.call("HDEL", key, field)
  local in_flight = tonumber(redis.call("HGET", key, "in_flight") or "0") - 1
  if in_flight < 0 then
    in_flight = 0
  end
  redis.call("HSET", key, "in_flight", in_flight)
  return true
end

local function inspect(key)
  local blocked_until = tonumber(redis.call("HGET", key, "blocked_until") or "0")
  if blocked_until > now then
    return true, blocked_until - now
  end
  if blocked_until > 0 then
    redis.call("HSET", key, "count", 0, "first_failure_at", 0, "blocked_until", 0)
  end
  local first_failure_at = tonumber(redis.call("HGET", key, "first_failure_at") or "0")
  if first_failure_at > 0 and now - first_failure_at >= window then
    redis.call("HSET", key, "count", 0, "first_failure_at", 0, "blocked_until", 0)
  end
  return false, 0
end

local had_email = consume(KEYS[1])
local had_ip = consume(KEYS[2])
if not had_email and not had_ip then
  return {0, 0, 0}
end

local email_blocked, email_retry = inspect(KEYS[1])
local ip_blocked, ip_retry = inspect(KEYS[2])
if email_blocked then
  return {1, 1, email_retry}
end
if ip_blocked then
  return {1, 2, ip_retry}
end

local function record(key, had_attempt)
  if not had_attempt then
    return false, 0
  end

  local count = tonumber(redis.call("HGET", key, "count") or "0")
  local first_failure_at = tonumber(redis.call("HGET", key, "first_failure_at") or "0")
  if count == 0 or first_failure_at == 0 or now - first_failure_at >= window then
    count = 1
    first_failure_at = now
    redis.call("HSET", key, "count", 1, "first_failure_at", first_failure_at, "blocked_until", 0)
  else
    count = count + 1
    redis.call("HSET", key, "count", count)
  end

  if count >= max_failures then
    local blocked_until = now + block_ms
    redis.call("HSET", key, "blocked_until", blocked_until)
    redis.call("PEXPIRE", key, block_ms)
    return true, block_ms
  end

  local remaining = window - (now - first_failure_at)
  if remaining < 1 then
    remaining = 1
  end
  local current_ttl = redis.call("PTTL", key)
  local next_ttl = math.max(current_ttl, remaining)
  if next_ttl > 0 then
    redis.call("PEXPIRE", key, next_ttl)
  end
  return false, 0
end

local email_now_blocked, email_now_retry = record(KEYS[1], had_email)
local ip_now_blocked, ip_now_retry = record(KEYS[2], had_ip)
if email_now_blocked then
  return {1, 1, email_now_retry}
end
if ip_now_blocked then
  return {1, 2, ip_now_retry}
end
return {0, 0, 0}
`;

const RELEASE_SCRIPT = `
local now = tonumber(ARGV[1])
local token = ARGV[2]
local clear_email = ARGV[3] == "1"

local function release(key, clear_failures)
  local field = "attempt:" .. token
  local expires_at = tonumber(redis.call("HGET", key, field) or "0")
  if expires_at == 0 then
    return
  end

  redis.call("HDEL", key, field)
  local in_flight = tonumber(redis.call("HGET", key, "in_flight") or "0") - 1
  if in_flight < 0 then
    in_flight = 0
  end
  if clear_failures then
    local blocked_until = tonumber(redis.call("HGET", key, "blocked_until") or "0")
    if expires_at > now and blocked_until <= now then
      redis.call("HSET", key, "count", 0, "first_failure_at", 0, "blocked_until", 0)
    end
  end
  redis.call("HSET", key, "in_flight", in_flight)
end

release(KEYS[1], clear_email)
release(KEYS[2], false)
return 1
`;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createLoginLimitKeys(identity: LoginIdentity): {
  email: string;
  ip: string;
} {
  return {
    email: `erp-sekolah:login:{v1}:email:${sha256(normalizeLoginEmail(identity.email))}`,
    ip: `erp-sekolah:login:{v1}:ip:${sha256(identity.ip.trim())}`,
  };
}

function parseDecision(value: unknown): LoginLimitDecision {
  if (!Array.isArray(value) || value.length < 3) {
    throw new Error("Respons rate limiter Redis tidak valid.");
  }
  const blocked = Number(value[0]);
  const dimensionCode = Number(value[1]);
  const retryAfterMs = Number(value[2]);
  if (![0, 1].includes(blocked) || ![0, 1, 2].includes(dimensionCode)) {
    throw new Error("Respons rate limiter Redis tidak valid.");
  }
  if (!Number.isFinite(retryAfterMs) || retryAfterMs < 0) {
    throw new Error("Respons rate limiter Redis tidak valid.");
  }
  return {
    blocked: blocked === 1,
    dimension: dimensionCode === 1 ? "email" : dimensionCode === 2 ? "ip" : null,
    retryAfterMs,
  };
}

function beginArgs(
  now: number,
  policy: LoginRateLimitPolicy,
  attemptId: string
): string[] {
  return [
    String(now),
    String(policy.windowMs),
    String(policy.maxFailures),
    String(policy.reservationMs),
    attemptId,
  ];
}

function failureArgs(
  now: number,
  policy: LoginRateLimitPolicy,
  attemptId: string
): string[] {
  return [
    String(now),
    String(policy.windowMs),
    String(policy.maxFailures),
    String(policy.blockMs),
    attemptId,
  ];
}

function allowedDecision(): LoginLimitDecision {
  return { blocked: false, dimension: null, retryAfterMs: 0 };
}

export function createUpstashLoginFailureLimiter(
  redis: RedisClient,
  options: { now?: () => number; policy?: LoginRateLimitPolicy } = {}
): LoginFailureLimiter {
  const now = options.now ?? Date.now;
  const policy = options.policy ?? LOGIN_RATE_LIMIT_POLICY;
  const beginScript = redis.createScript(BEGIN_SCRIPT);
  const failureScript = redis.createScript(FAILURE_SCRIPT);
  const releaseScript = redis.createScript(RELEASE_SCRIPT);

  return {
    async beginAttempt(identity) {
      const attemptId = randomUUID();
      const keys = createLoginLimitKeys(identity);
      const result = await beginScript.eval(
        [keys.email, keys.ip],
        beginArgs(now(), policy, attemptId)
      );
      const decision = parseDecision(result);
      return { ...decision, attemptId: decision.blocked ? null : attemptId };
    },
    async recordFailure(identity, attemptId) {
      const keys = createLoginLimitKeys(identity);
      const result = await failureScript.eval(
        [keys.email, keys.ip],
        failureArgs(now(), policy, attemptId)
      );
      return parseDecision(result);
    },
    async recordSuccess(identity, attemptId) {
      const keys = createLoginLimitKeys(identity);
      await releaseScript.eval(
        [keys.email, keys.ip],
        [String(now()), attemptId, "1"]
      );
    },
    async cancelAttempt(identity, attemptId) {
      const keys = createLoginLimitKeys(identity);
      await releaseScript.eval(
        [keys.email, keys.ip],
        [String(now()), attemptId, "0"]
      );
    },
  };
}

export function createMemoryLoginFailureLimiter(
  options: {
    now?: () => number;
    policy?: LoginRateLimitPolicy;
    store?: MemoryStore;
  } = {}
): LoginFailureLimiter {
  const now = options.now ?? Date.now;
  const policy = options.policy ?? LOGIN_RATE_LIMIT_POLICY;
  const store = options.store ?? new Map<string, MemoryAttempt>();

  const getEntry = (key: string) => {
    const entry = store.get(key) ?? {
      count: 0,
      firstFailureAt: 0,
      blockedUntil: 0,
      inFlight: new Map<string, number>(),
    };
    store.set(key, entry);
    return entry;
  };

  const cleanup = (entry: MemoryAttempt, timestamp: number) => {
    for (const [attemptId, expiresAt] of entry.inFlight) {
      if (expiresAt <= timestamp) entry.inFlight.delete(attemptId);
    }
  };

  const inspect = (key: string, timestamp: number) => {
    const entry = store.get(key);
    if (!entry) return null;
    cleanup(entry, timestamp);
    if (entry.blockedUntil > timestamp) {
      return { blocked: true, retryAfterMs: entry.blockedUntil - timestamp, entry };
    }
    if (entry.blockedUntil > 0 || (entry.firstFailureAt > 0 && timestamp - entry.firstFailureAt >= policy.windowMs)) {
      entry.blockedUntil = 0;
      entry.count = 0;
      entry.firstFailureAt = 0;
    }
    return { blocked: false, retryAfterMs: 0, entry };
  };

  const consume = (
    key: string,
    attemptId: string,
    timestamp: number
  ): 0 | 1 | 2 => {
    const entry = store.get(key);
    if (!entry) return 0;
    const expiresAt = entry.inFlight.get(attemptId);
    if (!expiresAt) return 0;
    entry.inFlight.delete(attemptId);
    return expiresAt > timestamp ? 2 : 1;
  };

  return {
    async beginAttempt(identity) {
      const timestamp = now();
      const keys = createLoginLimitKeys(identity);
      const email = inspect(keys.email, timestamp);
      const ip = inspect(keys.ip, timestamp);
      if (email?.blocked) {
        return { blocked: true, dimension: "email", retryAfterMs: email.retryAfterMs, attemptId: null };
      }
      if (ip?.blocked) {
        return { blocked: true, dimension: "ip", retryAfterMs: ip.retryAfterMs, attemptId: null };
      }

      const emailCapacity = (email?.entry.count ?? 0) + (email?.entry.inFlight.size ?? 0);
      const ipCapacity = (ip?.entry.count ?? 0) + (ip?.entry.inFlight.size ?? 0);
      if (emailCapacity >= policy.maxFailures) {
        return { blocked: true, dimension: "email", retryAfterMs: policy.reservationMs, attemptId: null };
      }
      if (ipCapacity >= policy.maxFailures) {
        return { blocked: true, dimension: "ip", retryAfterMs: policy.reservationMs, attemptId: null };
      }

      const attemptId = randomUUID();
      getEntry(keys.email).inFlight.set(attemptId, timestamp + policy.reservationMs);
      getEntry(keys.ip).inFlight.set(attemptId, timestamp + policy.reservationMs);
      return { ...allowedDecision(), attemptId };
    },

    async recordFailure(identity, attemptId) {
      const timestamp = now();
      const keys = createLoginLimitKeys(identity);
      let dimension: LoginLimitDimension | null = null;
      let retryAfterMs = 0;
      for (const [key, dimensionName] of [[keys.email, "email"], [keys.ip, "ip"]] as const) {
        const consumed = consume(key, attemptId, timestamp);
        if (consumed === 0) continue;
        const entry = store.get(key);
        if (!entry) continue;
        if (entry.blockedUntil > timestamp) {
          dimension ??= dimensionName;
          retryAfterMs = Math.max(retryAfterMs, entry.blockedUntil - timestamp);
          continue;
        }
        if (
          entry.firstFailureAt === 0 ||
          timestamp - entry.firstFailureAt >= policy.windowMs
        ) {
          entry.count = 0;
          entry.firstFailureAt = timestamp;
        }
        entry.count += 1;
        if (entry.count >= policy.maxFailures) {
          entry.blockedUntil = timestamp + policy.blockMs;
          dimension ??= dimensionName;
          retryAfterMs = Math.max(retryAfterMs, policy.blockMs);
        }
      }
      return dimension
        ? { blocked: true, dimension, retryAfterMs }
        : allowedDecision();
    },

    async recordSuccess(identity, attemptId) {
      const timestamp = now();
      const keys = createLoginLimitKeys(identity);
      if (consume(keys.email, attemptId, timestamp) === 2) {
        const email = store.get(keys.email);
        if (email && email.blockedUntil <= timestamp) {
          email.count = 0;
          email.firstFailureAt = 0;
          email.blockedUntil = 0;
        }
      }
      consume(keys.ip, attemptId, timestamp);
    },

    async cancelAttempt(identity, attemptId) {
      const timestamp = now();
      const keys = createLoginLimitKeys(identity);
      consume(keys.email, attemptId, timestamp);
      consume(keys.ip, attemptId, timestamp);
    },
  };
}

function validateUpstashUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new LoginRateLimitConfigurationError("Environment variable UPSTASH_REDIS_REST_URL tidak valid.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new LoginRateLimitConfigurationError("UPSTASH_REDIS_REST_URL harus berupa URL HTTPS tanpa kredensial.");
  }
  return value;
}

export function createLoginFailureLimiterFromEnv(
  options: { env?: NodeJS.ProcessEnv; now?: () => number } = {}
): LoginFailureLimiter {
  const env = options.env ?? process.env;
  const url = env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    if (env.NODE_ENV !== "development") {
      throw new LoginRateLimitConfigurationError(
        "Rate limiter production membutuhkan UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN."
      );
    }
    return createMemoryLoginFailureLimiter({ now: options.now });
  }
  const redis = new Redis({ url: validateUpstashUrl(url), token, enableTelemetry: false });
  return createUpstashLoginFailureLimiter(redis, { now: options.now });
}
