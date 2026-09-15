/**
 * Per-channel leases for the Sembol Cloud sponsor.
 *
 * A project has several channel (fee-source) accounts. Two sponsorship
 * requests that use the SAME channel at the same time would both read the same
 * on-chain sequence number and one would fail with tx_bad_seq. A lease fixes
 * that: a request holds a channel EXCLUSIVELY from before it reads the sequence
 * until the transaction is confirmed on-chain (sequence advanced), so no other
 * request can pick up a stale sequence for that channel.
 *
 * Two backends, chosen by environment:
 *
 *  - Redis (KV_REST_API_URL+KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_*): an
 *    atomic `SET key val NX PX ttl` per channel is the lock. Correct across
 *    every serverless instance and region. This is the production backend.
 *  - In-memory (default when no Redis env): a per-channel mutex in module
 *    scope. Correct within a single process / warm Fluid Compute instance,
 *    which is all a single-region low-concurrency v0 needs, and all the local
 *    concurrency test exercises. NOT correct across instances - provision
 *    Redis before scaling out. A one-time warning is logged.
 *
 * The lease carries a TTL (> the route's maxDuration) so a crashed request can
 * never wedge a channel permanently.
 */

const LEASE_TTL_MS = 90_000; // > maxDuration (60s); safety net for crashes
const ACQUIRE_TIMEOUT_MS = 75_000; // how long to wait for a free channel
const ACQUIRE_POLL_MS = 40;

export interface ChannelLease {
  channel: string; // the leased channel public key
  release: () => Promise<void>;
}

export interface LeaseBackend {
  /** Atomically acquire `key`. Returns a release fn, or null if already held. */
  tryAcquire: (key: string, ttlMs: number) => Promise<(() => Promise<void>) | null>;
  readonly kind: "redis" | "memory";
}

// ---------------------------------------------------------------- in-memory

interface MemLock {
  expiresAt: number;
  token: symbol;
}

class InMemoryBackend implements LeaseBackend {
  readonly kind = "memory" as const;
  private locks = new Map<string, MemLock>();

  async tryAcquire(key: string, ttlMs: number): Promise<(() => Promise<void>) | null> {
    // Single-threaded JS: check-and-set below is atomic within this process.
    const now = Date.now();
    const held = this.locks.get(key);
    if (held && held.expiresAt > now) return null;
    const token = Symbol(key);
    this.locks.set(key, { expiresAt: now + ttlMs, token });
    return async () => {
      const current = this.locks.get(key);
      // only release if we still own it (a TTL takeover must not be clobbered)
      if (current && current.token === token) this.locks.delete(key);
    };
  }
}

// ---------------------------------------------------------------- redis

interface RedisLike {
  set: (
    key: string,
    value: string,
    opts: { nx: true; px: number },
  ) => Promise<unknown>;
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
}

class RedisBackend implements LeaseBackend {
  readonly kind = "redis" as const;
  constructor(private redis: RedisLike) {}

  async tryAcquire(key: string, ttlMs: number): Promise<(() => Promise<void>) | null> {
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ok = await this.redis.set(key, token, { nx: true, px: ttlMs });
    if (ok === null || ok === undefined || ok === 0 || ok === false) return null;
    return async () => {
      // release only if we still own the key (compare-and-delete)
      const script =
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
      try {
        await this.redis.eval(script, [key], [token]);
      } catch {
        /* lease will TTL out */
      }
    };
  }
}

// ---------------------------------------------------------------- factory

let cached: LeaseBackend | null = null;
let warned = false;

async function buildBackend(): Promise<LeaseBackend> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const mod = (await import("@upstash/redis")) as {
        Redis: new (cfg: { url: string; token: string }) => RedisLike;
      };
      return new RedisBackend(new mod.Redis({ url, token }));
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "lease_redis_init_failed_falling_back_to_memory",
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
  if (!warned) {
    warned = true;
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "channel_lease_in_memory",
        detail:
          "No Redis configured; channel leases are per-instance only. Correct for single-instance v0; set KV_REST_API_URL+KV_REST_API_TOKEN before scaling out.",
      }),
    );
  }
  return new InMemoryBackend();
}

async function getBackend(): Promise<LeaseBackend> {
  if (!cached) cached = await buildBackend();
  return cached;
}

const leaseKey = (projectKey: string, channel: string) => `sembol:lease:${projectKey}:${channel}`;

/**
 * Acquire an exclusive lease on ANY free channel in the pool, waiting until one
 * frees (up to ACQUIRE_TIMEOUT_MS). Rotates start offset so load spreads.
 */
export async function acquireChannelLease(
  projectKey: string,
  channels: string[],
): Promise<ChannelLease> {
  if (channels.length === 0) throw new Error("No channel accounts configured for project");
  const backend = await getBackend();
  const deadline = Date.now() + ACQUIRE_TIMEOUT_MS;
  const offset = Math.floor(Math.random() * channels.length);

  for (;;) {
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[(offset + i) % channels.length];
      const release = await backend.tryAcquire(leaseKey(projectKey, channel), LEASE_TTL_MS);
      if (release) return { channel, release };
    }
    if (Date.now() > deadline) {
      throw new Error("All channel accounts busy; sponsor pool saturated");
    }
    await new Promise((r) => setTimeout(r, ACQUIRE_POLL_MS));
  }
}

/** Backend kind, for diagnostics/logging. */
export async function leaseBackendKind(): Promise<"redis" | "memory"> {
  return (await getBackend()).kind;
}
