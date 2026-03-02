const { getRedis } = require('../config/redis');

class PresenceService {
  constructor() {
    this.memoryPresence = new Map(); // fallback
  }

  async setOnline(userId, userName) {
    const redis = getRedis();
    try {
      await redis.sadd('online_users', userId);
      await redis.set(`user:${userId}:name`, userName);
      await redis.set(`user:${userId}:status`, 'online');
    } catch {
      this.memoryPresence.set(userId, { name: userName, status: 'online', since: new Date() });
    }
  }

  async setOffline(userId) {
    const redis = getRedis();
    try {
      await redis.srem('online_users', userId);
      await redis.set(`user:${userId}:status`, 'offline');
    } catch {
      this.memoryPresence.delete(userId);
    }
  }

  async getOnlineUsers() {
    const redis = getRedis();
    try {
      const userIds = await redis.smembers('online_users');
      const users = [];
      for (const id of userIds) {
        const name = await redis.get(`user:${id}:name`);
        if (name) users.push({ userId: id, name, status: 'online' });
      }
      return users;
    } catch {
      return [...this.memoryPresence.entries()].map(([id, data]) => ({
        userId: id, name: data.name, status: 'online'
      }));
    }
  }

  async isOnline(userId) {
    const redis = getRedis();
    try {
      const members = await redis.smembers('online_users');
      return members.includes(userId);
    } catch {
      return this.memoryPresence.has(userId);
    }
  }
}

module.exports = new PresenceService();
