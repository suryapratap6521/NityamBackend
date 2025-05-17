const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  content: { type: String, trim: true },
  media: {
    url: String,
    type: String, // image, video, file
  },
  type: {
    type: String,
    enum: ["text", "image", "video", "file", "audio"],
    default: "text"
  },
  status: {
    type: String,
    enum: ["sent", "delivered", "seen"],
    default: "sent"
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat"
  },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: { type: String }, // e.g., 👍, ❤️, 😂
    }
  ],
  edited: {
    type: Boolean,
    default: false,
  }

  
}, { timestamps: true });

messageSchema.index({ chat: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
