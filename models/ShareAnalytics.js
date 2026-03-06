const mongoose = require('mongoose');

const shareEventSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  sharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  platform: {
    type: String,
    enum: ['whatsapp', 'twitter', 'facebook', 'instagram', 'sms', 'email', 'other', 'unknown'],
    default: 'unknown'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

const shareClickSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  clickedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: {
    type: String
  },
  referer: {
    type: String
  },
  ipAddress: {
    type: String
  },
  convertedToAppOpen: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const ShareEvent = mongoose.model('ShareEvent', shareEventSchema);
const ShareClick = mongoose.model('ShareClick', shareClickSchema);

module.exports = { ShareEvent, ShareClick };
