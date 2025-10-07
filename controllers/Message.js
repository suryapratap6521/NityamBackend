const Message = require("../models/Message");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Notification=require("../models/Notification");
const Post =require('../models/Post');

exports.sendMessage = async (req, res) => {
  const { content, chatId, sharedPostId } = req.body;

  if ((!content && !sharedPostId) || !chatId) {
    return res.status(400).json({
      success: false,
      message: "Message content or shared post required",
    });
  }

  const newMessage = {
    sender: req.user.id,
    content: content || "",
    chat: chatId,
  };

  if (sharedPostId) {
    newMessage.sharedPost = sharedPostId;
  }

  try {
    let message = await Message.create(newMessage);

    message = await message.populate([
      { path: "sender", select: "firstName lastName image" },
      { path: "chat" },
      { path: "sharedPost", select: "title description imgPath postType" },
    ]);

    message = await Chat.populate(message, {
      path: "chat.users",
      select: "firstName lastName image email",
    });

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    // ✅ Emit via Socket.IO (real-time)
    const io = global.io;
    if (io && message.chat && message.chat.users) {
      message.chat.users.forEach((user) => {
        if (user._id.toString() !== req.user.id.toString()) {
          io.to(user._id.toString()).emit("message recieved", message);
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message created",
      message,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

    exports.allMessages = async (req, res) => {
        try {
         const messages=await Message.find({ chat: req.params.chatId })
         .populate("sender")
         .populate("chat")
         .exec()
         return res.status(200).json({
             success:true,
             json:"All messages",
             messages
         })
        } catch (error) {
         return res.status(500).json({
             success:false,
             json:"Internal server error"
         })
        }
     };

exports.markMessageAsDelivered = async (req, res) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    if (!message.deliveredTo.includes(userId)) {
      message.deliveredTo.push(userId);
      if (message.status !== "seen") {
        message.status = "delivered";
      }
      await message.save();
    }

    return res.status(200).json({ success: true, message: "Message marked as delivered" });
  } catch (err) {
    console.error("Delivery update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Mark message as seen
exports.markMessageAsSeen = async (req, res) => {
  try {
    const { messageId } = req.body;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Message not found" });

    if (!message.seenBy.includes(userId)) {
      message.seenBy.push(userId);
      message.status = "seen";
      await message.save();
    }

    return res.status(200).json({ success: true, message: "Message marked as seen" });
  } catch (err) {
    console.error("Seen update error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
