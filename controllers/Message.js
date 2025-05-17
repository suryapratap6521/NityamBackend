const Message = require("../models/Message");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Notification=require("../models/Notification");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");


exports.sendMessage = async (req, res) => {
  try {
    const { content, chatId, type } = req.body;
    const userId = req.user.id;

    if (!chatId || (!content && !req.files?.media)) {
      return res.status(400).json({
        success: false,
        message: "Please provide content or media with chatId",
      });
    }

    let mediaData = {};

    if (req.files?.media) {
      const mediaFiles = Array.isArray(req.files.media)
        ? req.files.media
        : [req.files.media];

      const uploadResults = await uploadFilesToCloudinary(
        mediaFiles,
        process.env.FOLDER_NAME
      );

      mediaData = {
        url: uploadResults[0]?.secure_url,
        type: uploadResults[0]?.resource_type,
      };
    }

    const newMessage = {
      sender: userId,
      content: content || "",
      chat: chatId,
      media: mediaData.url ? mediaData : undefined,
      type: mediaData.type || type || "text",
      status: "sent",
    };

    let message = await Message.create(newMessage);

    message = await message.populate([
      { path: "sender", select: "firstName lastName image _id" },
      { path: "chat" },
      { path: "chat.users", select: "firstName lastName image email" },
    ]);

    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
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


     exports.unreadCount= async (req, res) => {
        try {
          const messages = await Message.find({
            chat: req.params.chatId,
            readBy: { $ne: req.user.id }
          });
          res.status(200).json({ unreadCount: messages.length });
        } catch (error) {
          res.status(500).json({ message: "Error fetching unread count" });
        }
      };
      
      // Add reaction to a message
exports.addReaction = async (req, res) => {
    const { messageId, emoji } = req.body;
    const userId = req.user.id;
  
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: { reactions: { user: userId, emoji } },
        },
        { new: true }
      ).populate("reactions.user", "firstName lastName image");
  
      return res.status(200).json({ success: true, message });
    } catch (error) {
      console.error("Add reaction error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  // Remove reaction
  exports.removeReaction = async (req, res) => {
    const { messageId, emoji } = req.body;
    const userId = req.user.id;
  
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $pull: { reactions: { user: userId, emoji } },
        },
        { new: true }
      ).populate("reactions.user", "firstName lastName image");
  
      return res.status(200).json({ success: true, message });
    } catch (error) {
      console.error("Remove reaction error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
// DELETE a message
exports.deleteMessage = async (req, res) => {
    try {
      const { messageId } = req.params;
      const deleted = await Message.findByIdAndDelete(messageId);
  
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }
  
      return res.status(200).json({ success: true, message: "Message deleted", data: deleted });
    } catch (error) {
      console.error("Delete message error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  
  // EDIT a message
  exports.editMessage = async (req, res) => {
    try {
      const { messageId } = req.params;
      const { newContent } = req.body;
  
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { content: newContent, edited: true },
        { new: true }
      );
  
      if (!updated) {
        return res.status(404).json({ success: false, message: "Message not found" });
      }
  
      return res.status(200).json({ success: true, message: "Message updated", data: updated });
    } catch (error) {
      console.error("Edit message error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  };
  exports.searchMessages = async (req, res) => {
    const { chatId } = req.params;
    const { keyword } = req.query;
  
    if (!keyword) {
      return res.status(400).json({ success: false, message: "Keyword is required" });
    }
  
    try {
      const messages = await Message.find({
        chat: chatId,
        content: { $regex: keyword, $options: "i" }, // case-insensitive search
      })
        .populate("sender", "firstName lastName image")
        .sort({ createdAt: -1 });
  
      return res.status(200).json({
        success: true,
        count: messages.length,
        results: messages,
      });
    } catch (error) {
      console.error("Search error:", error);
      return res.status(500).json({ success: false, message: "Search failed" });
    }
  };
  