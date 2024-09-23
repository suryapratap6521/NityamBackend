const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  commentedBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  text: {
    type: String,
    // required: true,
  },
  commentedAt: {
    type: Date,
    default: new Date(),
    required: true,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  replies: [{
    repliedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    text: {
      type: String,
      // required: true,
    },
    repliedAt: {
      type: Date,
      default: new Date(),
      required: true,
    },
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }]
  }]
});

const postSchema = new mongoose.Schema({
  postByUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    // required: true,
  },
  imgPath: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  like: [{
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
  }],
  likes: [String],
  checkLike: {
    type: Boolean,
    default: false,
  },
  comments: [commentSchema],
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
