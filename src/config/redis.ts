import Redis from 'ioredis';

// Only create Redis connection if REDIS_URL is provided
console.log("🔍 Redis Configuration Debug:");
console.log("  - REDIS_URL environment variable:", process.env.REDIS_URL ? "SET" : "NOT SET");
console.log("  - REDIS_URL value:", process.env.REDIS_URL ? process.env.REDIS_URL.substring(0, 20) + "..." : "undefined");
console.log("  - All environment variables containing 'REDIS':", Object.keys(process.env).filter(key => key.includes('REDIS')));

export const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      connectTimeout: 10000,
      lazyConnect: true,
    })
  : null;

if (redis) {
  console.log("🔄 Attempting to connect to Redis...");
  redis.on("connect", () => console.log("✅ Connected to Redis successfully"));
  redis.on("error", err => console.error("❌ Redis error:", err.message));
  redis.on("ready", () => console.log("✅ Redis is ready for operations"));
  redis.on("close", () => console.log("🔌 Redis connection closed"));
} else {
  console.log("⚠️  Redis not configured - running without Redis");
}
/*
// Option 1: Using the direct Fly private IP
const redis = new Redis("redis://[fdaa:2f:e0b3:a7b:56b:7c85:4f51:2]:6379");

// Option 2: Using Fly’s internal DNS (recommended)
const redis = new Redis("redis://my-redis-app.internal:6379");

redis.on("connect", () => console.log("Connected to Redis ✅"));
redis.on("error", err => console.error("Redis error ❌", err));
*/
