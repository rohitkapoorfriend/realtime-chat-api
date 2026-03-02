const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const presenceService = require('../services/presence.service');
const router = express.Router();

router.use(auth);

router.get('/online', async (req, res, next) => {
  try {
    const users = await presenceService.getOnlineUsers();
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query "q" required' });

    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('name email avatar status lastSeen').limit(20);

    res.json({ success: true, data: users });
  } catch (error) { next(error); }
});

module.exports = router;
