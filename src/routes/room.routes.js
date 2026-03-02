const express = require('express');
const { auth } = require('../middleware/auth');
const roomService = require('../services/room.service');
const router = express.Router();

router.use(auth);

router.post('/', async (req, res, next) => {
  try {
    const room = await roomService.create(req.user._id, req.body);
    res.status(201).json({ success: true, data: room });
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const rooms = await roomService.getUserRooms(req.user._id);
    res.json({ success: true, data: rooms });
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const room = await roomService.getById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });
    res.json({ success: true, data: room });
  } catch (error) { next(error); }
});

router.post('/:id/join', async (req, res, next) => {
  try {
    const room = await roomService.join(req.params.id, req.user._id);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/invite', async (req, res, next) => {
  try {
    const room = await roomService.invite(req.params.id, req.user._id, req.body.userId);
    res.json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id/leave', async (req, res, next) => {
  try {
    await roomService.leave(req.params.id, req.user._id);
    res.json({ success: true, message: 'Left the room' });
  } catch (error) { next(error); }
});

module.exports = router;
