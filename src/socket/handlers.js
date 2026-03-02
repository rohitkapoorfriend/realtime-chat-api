const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');
const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

function setupHandlers(io, socket) {
  // === CONNECTION: Mark user online ===
  presenceService.setOnline(socket.userId, socket.userName);
  io.emit('presence:update', {
    userId: socket.userId,
    userName: socket.userName,
    status: 'online'
  });

  // === JOIN ROOM ===
  socket.on('room:join', async ({ roomId }) => {
    try {
      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      }

      if (!room.isMember(socket.userId)) {
        if (room.type === 'private') {
          return socket.emit('error', { code: 'ACCESS_DENIED', message: 'This is a private room' });
        }
        // Auto-join public rooms
        room.members.push({ userId: socket.userId, role: 'member' });
        await room.save();
      }

      socket.join(roomId);
      logger.debug(`${socket.userName} joined room ${room.name}`);

      // Notify room
      socket.to(roomId).emit('room:update', {
        roomId,
        event: 'user_joined',
        user: { id: socket.userId, name: socket.userName }
      });

      // Send recent messages
      const messages = await Message.find({ roomId, deleted: false })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'name avatar')
        .lean();

      socket.emit('room:history', { roomId, messages: messages.reverse() });
    } catch (error) {
      logger.error('room:join error:', error.message);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to join room' });
    }
  });

  // === LEAVE ROOM ===
  socket.on('room:leave', ({ roomId }) => {
    socket.leave(roomId);
    socket.to(roomId).emit('room:update', {
      roomId,
      event: 'user_left',
      user: { id: socket.userId, name: socket.userName }
    });
  });

  // === SEND MESSAGE ===
  socket.on('message:send', async ({ roomId, content, type = 'text' }) => {
    try {
      if (!content || !content.trim()) return;
      if (content.length > 5000) {
        return socket.emit('error', { code: 'MESSAGE_TOO_LONG', message: 'Max 5000 characters' });
      }

      const room = await Room.findById(roomId);
      if (!room || !room.isMember(socket.userId)) {
        return socket.emit('error', { code: 'ACCESS_DENIED', message: 'Not a member of this room' });
      }

      const message = await Message.create({
        roomId,
        sender: socket.userId,
        content: content.trim(),
        type
      });

      // Update room's last message
      room.lastMessage = { content: content.trim(), sender: socket.userId, sentAt: new Date() };
      await room.save();

      const populated = await Message.findById(message._id)
        .populate('sender', 'name avatar')
        .lean();

      // Broadcast to all in room (including sender)
      io.to(roomId).emit('message:new', {
        id: populated._id,
        roomId,
        sender: populated.sender,
        content: populated.content,
        type: populated.type,
        createdAt: populated.createdAt
      });

      logger.debug(`Message in ${room.name} from ${socket.userName}`);
    } catch (error) {
      logger.error('message:send error:', error.message);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to send message' });
    }
  });

  // === DIRECT MESSAGE ===
  socket.on('dm:send', async ({ toUserId, content }) => {
    try {
      if (!content || !content.trim()) return;

      const targetUser = await User.findById(toUserId);
      if (!targetUser) {
        return socket.emit('error', { code: 'USER_NOT_FOUND', message: 'User not found' });
      }

      // Find or create DM room
      let dmRoom = await Room.findOne({
        type: 'dm',
        'members.userId': { $all: [socket.userId, toUserId] }
      });

      if (!dmRoom) {
        dmRoom = await Room.create({
          name: `DM: ${socket.userName} & ${targetUser.name}`,
          type: 'dm',
          createdBy: socket.userId,
          members: [
            { userId: socket.userId, role: 'member' },
            { userId: toUserId, role: 'member' }
          ]
        });
      }

      const message = await Message.create({
        roomId: dmRoom._id,
        sender: socket.userId,
        content: content.trim(),
        type: 'text'
      });

      const populated = await Message.findById(message._id)
        .populate('sender', 'name avatar')
        .lean();

      const payload = {
        id: populated._id,
        roomId: dmRoom._id,
        sender: populated.sender,
        content: populated.content,
        type: 'text',
        isDM: true,
        createdAt: populated.createdAt
      };

      // Send to both users
      io.to(dmRoom._id.toString()).emit('message:new', payload);

      // Also emit to target user's personal socket if they haven't joined the DM room
      const targetSockets = await io.fetchSockets();
      for (const s of targetSockets) {
        if (s.userId === toUserId) {
          s.join(dmRoom._id.toString());
          s.emit('dm:new', payload);
        }
      }

      socket.join(dmRoom._id.toString());
    } catch (error) {
      logger.error('dm:send error:', error.message);
      socket.emit('error', { code: 'SERVER_ERROR', message: 'Failed to send DM' });
    }
  });

  // === TYPING INDICATORS ===
  socket.on('typing:start', ({ roomId }) => {
    socket.to(roomId).emit('typing:update', {
      roomId,
      userId: socket.userId,
      userName: socket.userName,
      isTyping: true
    });
  });

  socket.on('typing:stop', ({ roomId }) => {
    socket.to(roomId).emit('typing:update', {
      roomId,
      userId: socket.userId,
      userName: socket.userName,
      isTyping: false
    });
  });

  // === READ RECEIPTS ===
  socket.on('message:read', async ({ roomId, messageId }) => {
    try {
      await Message.updateOne(
        { _id: messageId, roomId },
        { $addToSet: { readBy: { userId: socket.userId } } }
      );

      socket.to(roomId).emit('message:read', {
        messageId,
        readBy: socket.userId,
        readAt: new Date()
      });
    } catch (error) {
      logger.error('message:read error:', error.message);
    }
  });

  // === DISCONNECT ===
  socket.on('disconnect', async () => {
    logger.info(`❌ User disconnected: ${socket.userName}`);

    presenceService.setOffline(socket.userId);

    // Update DB
    await User.updateOne(
      { _id: socket.userId },
      { status: 'offline', lastSeen: new Date() }
    );

    io.emit('presence:update', {
      userId: socket.userId,
      userName: socket.userName,
      status: 'offline',
      lastSeen: new Date()
    });
  });
}

module.exports = { setupHandlers };
