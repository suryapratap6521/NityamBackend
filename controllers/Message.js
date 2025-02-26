const Message = require("../models/Message");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Notification=require("../models/Notification");
exports.sendMessage = async (req, res) => {
    const { user } = req.user;
    const { content, chatId } = req.body;
    
    if (!content || !chatId) {
        return res.status(400).json({
            success: false,
            message: "All fields are required",
        });
    }

    const newMessage = {
        sender: req.user.id,
        content: content,
        chat: chatId,
    };

    try {
        let message = await Message.create(newMessage);

        // Populate sender
        message = await Message.populate(message, { path: "sender", select: "firstName lastName image" });

        // Populate chat
        message = await Message.populate(message, { path: "chat" });

        // Populate chat users
        message = await Chat.populate(message, { path: "chat.users", select: "firstName lastName image email" });

        

        await Chat.findByIdAndUpdate(req.body.chatId, {
            latestMessage: message,
        });

        // const notification = new Notification({
        //     recipient: message.users.find(u => u.toString() !== req.user._id.toString()),
        //     sender: req.user._id,
        //     type: 'chat',
        //     chat: message._id,
        //     message: `New message: ${content.substring(0, 30)}...`
        //   });
      
        //   await notification.save();

        return res.status(201).json({
            success: true,
            message: "Message created",
            message
        });
    } catch (error) {
        console.error(error);
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

