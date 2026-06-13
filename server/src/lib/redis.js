import Redis from 'ioredis';

let redis = null;

export function getRedis() {
  if (redis) return redis;

  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableOfflineQueue: false,
  });

  redis.on('error', (err) => {
    console.warn('[Redis] Connection error:', err.message);
  });

  return redis;
}

export async function connectRedis() {
  const client = getRedis();
  if (!client) {
    console.log('[Redis] Not configured — using in-memory fallback');
    return false;
  }
  try {
    await client.connect();
    console.log('[Redis] Connected');
    return true;
  } catch (err) {
    console.warn('[Redis] Unavailable:', err.message);
    return false;
  }
}

// In-memory fallback when Redis is unavailable
const memoryStore = new Map();

export async function cacheSet(key, value, ttlSeconds = 300) {
  const client = getRedis();
  const serialized = JSON.stringify(value);
  if (client) {
    await client.setex(key, ttlSeconds, serialized);
  } else {
    memoryStore.set(key, { value: serialized, expires: Date.now() + ttlSeconds * 1000 });
  }
}

export async function cacheGet(key) {
  const client = getRedis();
  if (client) {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  }
  const entry = memoryStore.get(key);
  if (!entry || entry.expires < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return JSON.parse(entry.value);
}

export async function blacklistToken(jti, expiresInSeconds) {
  const client = getRedis();
  const key = `blacklist:${jti}`;
  if (client) {
    await client.setex(key, expiresInSeconds, '1');
  } else {
    memoryStore.set(key, { value: '1', expires: Date.now() + expiresInSeconds * 1000 });
  }
}

export async function isTokenBlacklisted(jti) {
  const client = getRedis();
  const key = `blacklist:${jti}`;
  if (client) {
    return !!(await client.get(key));
  }
  const entry = memoryStore.get(key);
  return entry && entry.expires > Date.now();
}

export async function incrementRate(key, windowSeconds = 60) {
  const client = getRedis();
  if (client) {
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSeconds);
    return count;
  }
  const entry = memoryStore.get(key);
  if (!entry || entry.expires < Date.now()) {
    memoryStore.set(key, { value: 1, expires: Date.now() + windowSeconds * 1000 });
    return 1;
  }
  entry.value += 1;
  return entry.value;
}
