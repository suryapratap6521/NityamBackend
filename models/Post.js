const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

// Recursive reply schema (for true nested replies)
const replySchema = new mongoose.Schema({
  repliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  repliedAt: {
    type: Date,
    default: Date.now,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  replies: [this], // ✅ recursive nesting
});

// Comment schema
const commentSchema = new mongoose.Schema({
  commentedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  commentedAt: {
    type: Date,
    default: Date.now,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  replies: [replySchema], // ✅ nested replies
});

// Poll option schema
const pollOptionSchema = new mongoose.Schema({
  option: {
    type: String,
    required: true,
  },
  votes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
});

// Main Post schema
const postSchema = new mongoose.Schema({
  postType: {
    type: String, // 'post', 'event', 'poll', 'repost'
    required: true,
  },

  postByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Basic content
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  imgPath: [{
    type: String,
    trim: true,
  }],

  // Likes
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],

  // Comments
  comments: [commentSchema],

  // Event-specific
  eventType: String,
  eventName: String,
  startDate: Date,
  endDate: Date,
  location: String,
  hostedBy: String,
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  maxAttendees: {
    type: Number,
    default: null, // null means unlimited
  },
  category: {
    type: String,
    trim: true,
  },
  price: {
    type: String,
    default: "Free",
  },

  // Poll-specific
  pollOptions: {
    type: [pollOptionSchema],
    validate: {
      validator: function (v) {
        return this.postType !== 'poll' || (v.length >= 2 && v.length <= 4);
      },
      message: "Poll must have 2 to 4 options",
    }
  },

  // Repost
  repostedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// ✅ Apply soft delete plugin
postSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("Post", postSchema);
