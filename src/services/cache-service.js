import { createClient } from "redis";
import env from "../config/env.js";

class HybridCache {
  constructor({ ttlMs, redisUrl }) {
    this.ttlMs = ttlMs;
    this.memory = new Map();
    this.redis = null;
    this.redisReady = false;

    if (redisUrl) {
      this.redis = createClient({ url: redisUrl });
      this.redis.on("error", (error) => {
        this.redisReady = false;
        console.error("[CACHE] Redis indisponivel, fallback para memoria:", error.message);
      });
      this.redis
        .connect()
        .then(() => {
          this.redisReady = true;
          console.log("[CACHE] Redis conectado.");
        })
        .catch((error) => {
          this.redisReady = false;
          console.error("[CACHE] Falha ao conectar Redis:", error.message);
        });
    }
  }

  get ttlSeconds() {
    return Math.max(1, Math.floor(this.ttlMs / 1000));
  }

  async get(key) {
    if (this.redis && this.redisReady) {
      const value = await this.redis.get(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    const item = this.memory.get(key);
    if (!item) return null;
    if (Date.now() - item.createdAt > this.ttlMs) {
      this.memory.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value) {
    if (this.redis && this.redisReady) {
      await this.redis.set(key, JSON.stringify(value), {
        EX: this.ttlSeconds
      });
      return;
    }

    this.memory.set(key, {
      value,
      createdAt: Date.now()
    });
    this.compactMemory();
  }

  compactMemory() {
    const now = Date.now();
    for (const [key, item] of this.memory.entries()) {
      if (now - item.createdAt > this.ttlMs) {
        this.memory.delete(key);
      }
    }
    if (this.memory.size <= 500) return;
    const ordered = [...this.memory.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    for (let i = 0; i < ordered.length - 500; i += 1) {
      this.memory.delete(ordered[i][0]);
    }
  }
}

export const responseCache = new HybridCache({
  ttlMs: env.CACHE_TTL_MS,
  redisUrl: env.REDIS_URL
});
