const Room = require('../models/Room');

class RoomService {
  async create(userId, { name, description, type }) {
    const room = await Room.create({
      name,
      description: description || '',
      type: type || 'public',
      createdBy: userId,
      members: [{ userId, role: 'admin' }]
    });
    return room;
  }

  async getUserRooms(userId) {
    return Room.find({ 'members.userId': userId })
      .populate('members.userId', 'name avatar status')
      .sort({ 'lastMessage.sentAt': -1, createdAt: -1 });
  }

  async getById(roomId) {
    return Room.findById(roomId)
      .populate('members.userId', 'name avatar status')
      .populate('createdBy', 'name');
  }

  async join(roomId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new Error('Room not found');
    if (room.type === 'private') throw new Error('Cannot join private room');
    if (room.isMember(userId)) throw new Error('Already a member');

    room.members.push({ userId, role: 'member' });
    await room.save();
    return room;
  }

  async invite(roomId, inviterId, targetUserId) {
    const room = await Room.findById(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.isAdmin(inviterId)) throw new Error('Only admins can invite');
    if (room.isMember(targetUserId)) throw new Error('User is already a member');

    room.members.push({ userId: targetUserId, role: 'member' });
    await room.save();
    return room;
  }

  async leave(roomId, userId) {
    const room = await Room.findById(roomId);
    if (!room) throw new Error('Room not found');

    room.members = room.members.filter(m => m.userId.toString() !== userId.toString());
    await room.save();
    return room;
  }
}

module.exports = new RoomService();
