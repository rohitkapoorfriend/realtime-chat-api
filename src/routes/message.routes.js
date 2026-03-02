const express = require('express');
const { auth } = require('../middleware/auth');
const chatService = require('../services/chat.service');
const Room = require('../models/Room');
const router = express.Router();

router.use(auth);

// Get messages for a room (also works via /api/rooms/:id/messages)
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room || !room.isMember(req.user._id)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { page, limit } = req.query;
    const result = await chatService.getMessages(req.params.roomId, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 50, 100)
    });

    res.json({ success: true, ...result });
  } catch (error) { next(error); }
});

// Search messages
router.get('/search', async (req, res, next) => {
  try {
    const { q, page, limit } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });

    const messages = await chatService.search(req.user._id, q, {
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 50)
    });

    res.json({ success: true, data: messages });
  } catch (error) { next(error); }
});

// Delete message
router.delete('/:id', async (req, res, next) => {
  try {
    await chatService.deleteMessage(req.params.id, req.user._id.toString());
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
