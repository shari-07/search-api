import Redis from 'ioredis';

// Only create Redis connection if REDIS_URL is provided
export const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      connectTimeout: 10000,
      lazyConnect: true,
    })
  : null;

if (redis) {
  redis.on("connect", () => console.log("Connected to Redis ✅"));
  redis.on("error", err => console.error("Redis error ❌", err));
} else {
  console.log("Redis not configured - running without Redis");
}
/*
// Option 1: Using the direct Fly private IP
const redis = new Redis("redis://[fdaa:2f:e0b3:a7b:56b:7c85:4f51:2]:6379");

// Option 2: Using Fly’s internal DNS (recommended)
const redis = new Redis("redis://my-redis-app.internal:6379");

redis.on("connect", () => console.log("Connected to Redis ✅"));
redis.on("error", err => console.error("Redis error ❌", err));
*/
