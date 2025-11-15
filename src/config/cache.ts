// In-memory cache implementation (no Redis required)
interface CacheEntry {
  value: any;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxSize: number; // Maximum number of cache entries

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    // Clean up expired entries every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000); // 1 hour
  }

  set(key: string, value: any, ttlSeconds: number): void {
    // If cache is full, remove oldest entries (LRU-like)
    if (this.cache.size >= this.maxSize) {
      this.evictOldest(10); // Remove 10 oldest entries
    }
    
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }
  
  private evictOldest(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt); // Sort by expiration time
    
    const toDelete = Math.min(count, entries.length);
    for (let i = 0; i < toDelete; i++) {
      const entry = entries[i];
      if (entry) {
        this.cache.delete(entry[0]);
      }
    }
  }

  async get(key: string): Promise<any | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  stats(): { 
    size: number; 
    maxSize: number;
    entries: string[];
    estimatedMemoryMB: number;
  } {
    // Estimate memory usage: key size + value size + overhead
    let estimatedBytes = 0;
    for (const [key, entry] of this.cache.entries()) {
      // Key size (string)
      estimatedBytes += key.length * 2; // 2 bytes per character (UTF-16)
      // Value size (rough estimate: JSON stringify length)
      estimatedBytes += JSON.stringify(entry.value).length * 2;
      // Overhead: object reference, expiresAt (8 bytes)
      estimatedBytes += 100; // Rough overhead estimate
    }
    
    const estimatedMemoryMB = Math.round((estimatedBytes / 1024 / 1024) * 100) / 100;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()),
      estimatedMemoryMB: estimatedMemoryMB
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Redis cache wrapper (optional)
import Redis from 'ioredis';

class RedisCache {
  private redis: Redis | null = null;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false,
        connectTimeout: 10000,
        lazyConnect: true,
      });

      this.redis.on("connect", () => console.log("✅ Redis cache connected"));
      this.redis.on("error", err => console.error("❌ Redis cache error:", err.message));
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }

  async get(key: string): Promise<any | null> {
    if (!this.redis) return null;

    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      console.error('Redis get error:', err);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redis) return;
    await this.redis.del(key);
  }

  async clear(): Promise<void> {
    if (!this.redis) return;
    await this.redis.flushdb();
  }
}

// Unified cache interface
export class Cache {
  private redisCache: RedisCache;
  private memoryCache: InMemoryCache;

  constructor(redisUrl?: string, maxMemoryEntries: number = 1000) {
    this.redisCache = new RedisCache(redisUrl);
    this.memoryCache = new InMemoryCache(maxMemoryEntries);
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    // Try Redis first, fall back to memory
    await this.redisCache.set(key, value, ttlSeconds);
    this.memoryCache.set(key, value, ttlSeconds);
  }

  async get(key: string): Promise<any | null> {
    // Try Redis first, fall back to memory
    const redisValue = await this.redisCache.get(key);
    if (redisValue) {
      // Keep memory cache in sync
      this.memoryCache.set(key, redisValue, 24 * 60 * 60); // 24 hours
      return redisValue;
    }

    return this.memoryCache.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.redisCache.delete(key);
    this.memoryCache.delete(key);
  }

  stats() {
    const memoryStats = this.memoryCache.stats();
    return {
      memory: memoryStats,
      redis: process.env.REDIS_URL ? 'configured' : 'not configured'
    };
  }
}

// Export singleton instance
const MAX_CACHE_ENTRIES = parseInt(process.env.MAX_CACHE_ENTRIES || '1000', 10);
export const cache = new Cache(process.env.REDIS_URL, MAX_CACHE_ENTRIES);

console.log('📦 Cache initialized');
if (process.env.REDIS_URL) {
  console.log('  - Redis: enabled');
} else {
  console.log('  - Redis: disabled (using in-memory cache only)');
}
console.log('  - Memory cache: enabled');
console.log(`  - Max cache entries: ${MAX_CACHE_ENTRIES}`);
console.log(`  - Estimated max memory: ~${Math.round(MAX_CACHE_ENTRIES * 0.5)}MB (assuming ~0.5MB per entry)`);

