const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  type: { type: String, enum: ['public', 'private', 'dm'], default: 'public' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  lastMessage: {
    content: { type: String },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now }
});

roomSchema.index({ 'members.userId': 1 });
roomSchema.index({ type: 1 });

// Check if user is a member
roomSchema.methods.isMember = function (userId) {
  return this.members.some(m => m.userId.toString() === userId.toString());
};

// Check if user is admin
roomSchema.methods.isAdmin = function (userId) {
  return this.members.some(m => m.userId.toString() === userId.toString() && m.role === 'admin');
};

module.exports = mongoose.model('Room', roomSchema);
