import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts — Redis is optional in dev
      if (times > 3) return null;
      return Math.min(times * 500, 2000);
    },
  });

  client.on("error", () => {
    // Silently swallow Redis errors in development — falls back to in-memory
  });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  return client;
}

export const redis: Redis =
  global.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}
