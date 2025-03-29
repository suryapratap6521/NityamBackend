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

const pollOptionSchema = new mongoose.Schema({
  option: {
    type: String,
    required: true,
  },
  votes: [{
    type: mongoose.Types.ObjectId,
    ref: "User",
  }]
});

// Post Schema
const postSchema = new mongoose.Schema({
  postType: {
    type: String,  // 'post', 'event', or 'poll'
    required: true,
  },
  
  // Common Fields
  postByUser: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
  },
  description:{
    type:String,
  },
  imgPath: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  }, eventType: {
    type: String,
  },
  eventName: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  location: {
    type: String,
  },
  hostedBy: {
    type: String,
  },
 

  // Poll-specific Fields
  pollOptions: {
    type: [pollOptionSchema],
    validate: {
      validator: function (v) {
        // Only validate poll options if postType is 'poll'
        if (this.postType === 'poll') {
          return v.length >= 2 && v.length <= 4; // Min 2 options, Max 4 options
        }
        // Return true if postType is not 'poll' (skip validation)
        return true;
      },
      message: 'A poll must have between 2 and 4 options.',
    },
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