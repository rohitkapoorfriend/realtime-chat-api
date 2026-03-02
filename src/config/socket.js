const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { setupHandlers } = require('../socket/handlers');
const { socketRateLimiter } = require('../socket/middleware');
const logger = require('../utils/logger');

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Auth middleware — verify JWT before allowing connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const User = require('../models/User');
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.userName = user.name;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Rate limiting middleware
  io.use(socketRateLimiter);

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`🔗 User connected: ${socket.userName} (${socket.userId})`);
    setupHandlers(io, socket);
  });

  logger.info('🔌 Socket.io initialized');
  return io;
}

module.exports = { initSocket };
