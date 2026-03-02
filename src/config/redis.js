const logger = require('../utils/logger');

let redisClient = null;
let redisSub = null;

// In-memory fallback when Redis is disabled
const memoryStore = {
  data: new Map(),
  async get(key) { return this.data.get(key) || null; },
  async set(key, value, ...args) { this.data.set(key, value); return 'OK'; },
  async del(key) { this.data.delete(key); return 1; },
  async keys(pattern) {
    const prefix = pattern.replace('*', '');
    return [...this.data.keys()].filter(k => k.startsWith(prefix));
  },
  async smembers(key) { return [...(this.data.get(key) || [])]; },
  async sadd(key, ...members) {
    if (!this.data.has(key)) this.data.set(key, new Set());
    members.forEach(m => this.data.get(key).add(m));
    return members.length;
  },
  async srem(key, ...members) {
    const set = this.data.get(key);
    if (!set) return 0;
    members.forEach(m => set.delete(m));
    return members.length;
  }
};

async function connectRedis() {
  if (process.env.REDIS_ENABLED === 'false') {
    logger.info('⚠️  Using in-memory store (Redis disabled)');
    return;
  }

  try {
    const Redis = require('ioredis');
    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redisClient = new Redis(url);
    redisSub = new Redis(url);

    await redisClient.ping();
    logger.info('✅ Redis connected');
  } catch (error) {
    logger.warn('⚠️  Redis connection failed, using in-memory fallback:', error.message);
    redisClient = null;
    redisSub = null;
  }
}

function getRedis() {
  return redisClient || memoryStore;
}

function getRedisSub() {
  return redisSub;
}

module.exports = { connectRedis, getRedis, getRedisSub };
