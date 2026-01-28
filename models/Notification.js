const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  type: {
    type: String,
    enum: ['post', 'chat', 'poll', 'event', 'event_booking', 'like', 'comment', 'reply'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// ✅ Apply soft delete plugin
notificationSchema.plugin(softDeletePlugin);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;