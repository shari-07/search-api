import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

redis.on("connect", () => console.log("Connected to Redis ✅"));
redis.on("error", err => console.error("Redis error ❌", err));
/*
// Option 1: Using the direct Fly private IP
const redis = new Redis("redis://[fdaa:2f:e0b3:a7b:56b:7c85:4f51:2]:6379");

// Option 2: Using Fly’s internal DNS (recommended)
const redis = new Redis("redis://my-redis-app.internal:6379");

redis.on("connect", () => console.log("Connected to Redis ✅"));
redis.on("error", err => console.error("Redis error ❌", err));
*/
