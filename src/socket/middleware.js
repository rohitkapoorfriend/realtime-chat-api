const logger = require('../utils/logger');

// Simple in-memory rate limiter for WebSocket messages
const messageCounts = new Map();
const MAX_PER_MINUTE = parseInt(process.env.MAX_MESSAGES_PER_MINUTE) || 30;

function socketRateLimiter(socket, next) {
  const originalEmit = socket.emit;

  // Track message:send events
  socket.onAny((event) => {
    if (event === 'message:send' || event === 'dm:send') {
      const key = socket.userId;
      const now = Date.now();
      const window = 60000; // 1 minute

      if (!messageCounts.has(key)) {
        messageCounts.set(key, []);
      }

      const timestamps = messageCounts.get(key).filter(t => now - t < window);
      timestamps.push(now);
      messageCounts.set(key, timestamps);

      if (timestamps.length > MAX_PER_MINUTE) {
        socket.emit('error', {
          code: 'RATE_LIMIT',
          message: `Max ${MAX_PER_MINUTE} messages per minute. Please slow down.`
        });
        logger.warn(`Rate limit hit: ${socket.userName}`);
        return;
      }
    }
  });

  next();
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of messageCounts) {
    const active = timestamps.filter(t => now - t < 60000);
    if (active.length === 0) messageCounts.delete(key);
    else messageCounts.set(key, active);
  }
}, 5 * 60 * 1000);

module.exports = { socketRateLimiter };
