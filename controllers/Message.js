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

  try {
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (chat.isGroupChat && chat.leftMembers && chat.leftMembers.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You cannot send messages after leaving the group. You have read-only access.",
      });
    }

    if (!chat.users.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this chat",
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

    // ✅ Emit via Socket.IO (real-time) & Create notifications for each recipient
    const io = global.io;
    if (io && message.chat && message.chat.users) {
      const sender = await User.findById(req.user.id).select("firstName lastName image");
      
      message.chat.users.forEach(async (user) => {
        if (user._id.toString() !== req.user.id.toString()) {
          // Emit real-time message
          io.to(user._id.toString()).emit("message recieved", message);
          
          // ✅ Create notification for direct message
          const notification = await Notification.create({
            recipient: user._id,
            sender: req.user.id,
            chat: chatId,
            type: "chat",
            message: `${sender.firstName} ${sender.lastName} sent you a message: "${content ? content.substring(0, 30) : 'Shared a post'}${content && content.length > 30 ? '...' : ''}"`,
          });

          // ✅ Emit notification
          io.to(user._id.toString()).emit("newNotification", {
            _id: notification._id,
            sender: {
              _id: sender._id,
              firstName: sender.firstName,
              lastName: sender.lastName,
              image: sender.image,
            },
            chat: chatId,
            type: "chat",
            message: notification.message,
            read: false,
            createdAt: notification.createdAt,
          });
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
         const chat = await Chat.findById(req.params.chatId);
         
         if (!chat) {
           return res.status(404).json({
             success: false,
             message: "Chat not found"
           });
         }
         
         const userId = req.user.id;
         const isActiveMember = chat.users.includes(userId);
         const isLeftMember = chat.leftMembers && chat.leftMembers.includes(userId);
         
         if (!isActiveMember && !isLeftMember) {
           return res.status(403).json({
             success: false,
             message: "You do not have access to this chat"
           });
         }
         
         const messages = await Message.find({ chat: req.params.chatId })
         .populate("sender")
         .populate("chat")
         .exec();
         
         return res.status(200).json({
             success: true,
             message: "All messages",
             messages,
             isLeftMember
         });
        } catch (error) {
         return res.status(500).json({
             success: false,
             message: "Internal server error"
         });
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
