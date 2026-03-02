require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { connectDB } = require('./config/database');
const { initSocket } = require('./config/socket');
const { connectRedis } = require('./config/redis');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const messageRoutes = require('./routes/message.routes');
const userRoutes = require('./routes/user.routes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Serve test client
app.use(express.static(path.join(__dirname, 'public')));
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connections: global.io ? global.io.engine.clientsCount : 0
  });
});

// REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use(errorHandler);

// Start
async function start() {
  try {
    await connectDB();

    if (process.env.REDIS_ENABLED !== 'false') {
      await connectRedis();
    } else {
      logger.info('⚠️  Redis disabled — using in-memory presence');
    }

    // Initialize Socket.io
    const io = initSocket(server);
    global.io = io;

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      logger.info(`💬 Chat API running on port ${PORT}`);
      logger.info(`🧪 Test client: http://localhost:${PORT}/chat`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start:', error);
    process.exit(1);
  }
}

start();

module.exports = { app, server };
