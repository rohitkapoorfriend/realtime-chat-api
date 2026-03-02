const Message = require('../models/Message');

class ChatService {
  async getMessages(roomId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      Message.find({ roomId, deleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name avatar')
        .lean(),
      Message.countDocuments({ roomId, deleted: false })
    ]);

    return {
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async search(userId, query, { page = 1, limit = 20 } = {}) {
    const Room = require('../models/Room');
    const userRooms = await Room.find({ 'members.userId': userId }).select('_id');
    const roomIds = userRooms.map(r => r._id);

    const skip = (page - 1) * limit;
    const messages = await Message.find({
      roomId: { $in: roomIds },
      deleted: false,
      $text: { $search: query }
    })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar')
      .populate('roomId', 'name type')
      .lean();

    return messages;
  }

  async deleteMessage(messageId, userId) {
    const message = await Message.findById(messageId);
    if (!message) throw new Error('Message not found');
    if (message.sender.toString() !== userId) throw new Error('Can only delete own messages');

    message.deleted = true;
    message.content = '[Message deleted]';
    await message.save();
    return message;
  }
}

module.exports = new ChatService();
