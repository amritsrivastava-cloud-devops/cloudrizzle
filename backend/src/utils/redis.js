const Redis = require('ioredis');
const logger = require('./logger');

let redisClient;

const connectRedis = async () => {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3
  });

  redisClient.on('connect', () => logger.info('✅ Redis connected'));
  redisClient.on('error', (err) => logger.error('Redis error:', err));

  await redisClient.ping();
  return redisClient;
};

const getRedis = () => {
  if (!redisClient) throw new Error('Redis not initialized');
  return redisClient;
};

// Cache helpers
const cache = {
  async get(key) {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  },
  async set(key, value, ttlSeconds = 300) {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  },
  async del(key) {
    await redisClient.del(key);
  },
  async flush(pattern) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) await redisClient.del(...keys);
  }
};

module.exports = { connectRedis, getRedis, cache };
