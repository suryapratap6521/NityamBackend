const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  repliedBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  text: {
    type: String,
  },
  repliedAt: {
    type: Date,
    default: Date.now,
  },
  likes: [{
    type: mongoose.Types.ObjectId,
    ref: 'User',
  }],
  replies: [this], // Recursive structure for nested replies
});

const commentSchema = new mongoose.Schema({
  commentedBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  text: {
    type: String,
  },
  commentedAt: {
    type: Date,
    default: Date.now,
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  replies: [replySchema], // Nested replies
});

const pollOptionSchema = new mongoose.Schema({
  option: {
    type: String,
    required: true,
  },
  votes: [{
    type: mongoose.Types.ObjectId,
    ref: "User",
  }],
});

const postSchema = new mongoose.Schema({
  postType: {
    type: String,
    required: true,
  },
  postByUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
  },
  imgPath: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  pollOptions: {
    type: [pollOptionSchema],
    validate: {
      validator: function (v) {
        if (this.postType === 'poll') {
          return v.length >= 2 && v.length <= 4;
        }
        return true;
      },
      message: 'A poll must have between 2 and 4 options.',
    },
  },
  like: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [commentSchema],
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
