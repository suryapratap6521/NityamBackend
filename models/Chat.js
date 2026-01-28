const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

const chatSchema = new mongoose.Schema({
    chatName: {
        type: String,
        trim: true,
    },
    isGroupChat: {
        type: Boolean,
        default: false,
    },
    groupPhoto: {
        type: String,
        default: null,
    },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  latestMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
unreadCounts: [
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    count: { type: Number, default: 0 }
  }
],
  leftMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
}, {
    timestamps: true,
});

// ✅ Apply soft delete plugin
chatSchema.plugin(softDeletePlugin);

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
