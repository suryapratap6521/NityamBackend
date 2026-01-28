const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");

exports.accessChat = async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "UserId param not sent with request",
    });
  }

  try {
    const existingChat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user.id, userId] }
    })
    .populate("users", "-password")
    .populate({
      path: "latestMessage",
      populate: {
        path: "sender",
        select: "-password",
      },
    });
   

    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: "Existing chat fetched",
        chat: existingChat,
      });
    }

    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user.id, userId],
    };

    const createdChat = await Chat.create(chatData);
    console.log("New chat created:", createdChat);

    const fullChat = await Chat.findById(createdChat._id)
      .populate("users", "-password")
      .populate({
        path: "latestMessage",
        populate: {
          path: "sender",
          select: "-password",
        },
      });
    return res.status(201).json({
      success: true,
      message: "Chat created successfully",
      chat: fullChat,
    });
  } catch (error) {
    console.error("Error accessing/creating chat:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in accessing or creating the chat",
    });
  }
};



exports.fetchChats = async (req, res) => {
    try {
        const activeChats = await Chat.find({ users: req.user.id })
            .populate({
                path: 'users',
                select: '-password'
            })
            .populate({
                path: 'latestMessage',
                populate: {
                    path: 'sender',
                    select: 'firstName lastName image communityDetails email'
                }
            })
            .populate('groupAdmin', '-password')
            .populate('leftMembers', 'firstName lastName image');

        const leftChats = await Chat.find({ 
            leftMembers: req.user.id,
            users: { $ne: req.user.id }
        })
            .populate({
                path: 'users',
                select: '-password'
            })
            .populate({
                path: 'latestMessage',
                populate: {
                    path: 'sender',
                    select: 'firstName lastName image communityDetails email'
                }
            })
            .populate('groupAdmin', '-password')
            .populate('leftMembers', 'firstName lastName image');

        const allChats = [...activeChats, ...leftChats].sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        const chatsWithStatus = allChats.map(chat => ({
            ...chat.toObject(),
            isLeftMember: chat.leftMembers && chat.leftMembers.some(
                member => member._id.toString() === req.user.id
            )
        }));

        return res.status(200).json({
            success: true,
            message: 'Fetching all chats',
            chat: chatsWithStatus
        });
    } catch (error) {
        console.error('Error fetching chats:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error in fetching chats'
        });
    }
};

exports.createGroupChat = async (req, res) => {
    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please fill all the fields" });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res.status(400).send("More than 2 users are required to form a group chat");
    }
   
    // Assuming req.user is the current user's object
    const groupAdmin = req.user.id;
    
    // Add the group creator to the users array
    users.push(groupAdmin);

    try {
        let groupPhotoUrl = null;

        // Handle group photo upload if provided
        if (req.files && req.files.groupPhoto) {
            try {
                const uploadedImage = await uploadFilesToCloudinary(
                    [req.files.groupPhoto],
                    "group_photos",
                    { width: 500, height: 500, crop: "fill" }
                );
                groupPhotoUrl = uploadedImage[0].secure_url;
            } catch (uploadError) {
                console.error("Group photo upload error:", uploadError);
                // Continue without photo if upload fails
            }
        }

        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: groupAdmin,
            groupPhoto: groupPhotoUrl,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        // Create system message for group creation
        const Message = require("../models/Message");
        const User = require("../models/User");
        const creator = await User.findById(groupAdmin).select("firstName lastName");
        
        const systemMessage = await Message.create({
            sender: groupAdmin,
            content: `${creator.firstName} ${creator.lastName} created the group "${fullGroupChat.chatName}"`,
            chat: groupChat._id,
            isSystemMessage: true,
        });

        const populatedSystemMessage = await Message.findById(systemMessage._id)
            .populate("sender", "firstName lastName image")
            .populate("chat");

        // Update chat with latest message
        await Chat.findByIdAndUpdate(groupChat._id, { latestMessage: populatedSystemMessage });

        // Get updated chat with latest message
        const updatedGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage");

        const io = global.io;
        if (io && updatedGroupChat.users) {
            updatedGroupChat.users.forEach((user) => {
                io.to(user._id.toString()).emit("new group created", {
                    chat: updatedGroupChat,
                    message: populatedSystemMessage
                });
            });
        }

        res.status(200).json(updatedGroupChat);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error in creating group chat"
        });
    }
};
exports.renameGroup = async (req, res) => {
    try {
        const { chatId, name } = req.body;
        console.log(chatId,name);
        if (!chatId || !name) {
            return res.status(400).json({
                success: false,
                message: "Both chatId and name are required fields",
            });
        }

        const updatedChat = await Chat.findByIdAndUpdate(
            { _id: chatId },
            { chatName: name },
            { new: true }
        )
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        return res.status(200).json({
            success: true,
            message: "Group chat renamed successfully",
            updatedChat: updatedChat
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error in changing the name of the group chat",
        });
    }
};
exports.addToGroup = async (req, res) => {
    try {
        const { chatId, userId } = req.body;
        if (!userId || !chatId) {
            return res.status(400).json({
                success: false,
                message: "Both userId and chatId are required fields",
            });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        if (chat.users.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: "User already in group",
            });
        }

        const added = await Chat.findByIdAndUpdate(chatId,
            {
                $push: { users: userId },
            },
            { new: true }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");

        if (!added) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        const Message = require("../models/Message");
        const adderUser = await require("../models/User").findById(req.user.id);
        const addedUser = await require("../models/User").findById(userId);

        const systemMessage = await Message.create({
            sender: req.user.id,
            content: `${addedUser.firstName} ${addedUser.lastName} was added by ${adderUser.firstName} ${adderUser.lastName}`,
            chat: chatId,
            isSystemMessage: true,
        });

        const populatedMessage = await Message.findById(systemMessage._id)
            .populate("sender", "firstName lastName image")
            .populate("chat");

        await Chat.findByIdAndUpdate(chatId, { latestMessage: populatedMessage });

        const io = global.io;
        if (io && added.users) {
            added.users.forEach((user) => {
                io.to(user._id.toString()).emit("user added to group", {
                    chat: added,
                    message: populatedMessage,
                });
            });
        }

        return res.status(200).json({
            success: true,
            message: "User added successfully",
            updatedChat: added
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error in adding the user to the group",
        });
    }
};

exports.removeFromGroup = async (req, res) => {
    try {
        const { chatId, userId } = req.body;
        console.log(chatId);
        console.log(userId)
        if (!userId || !chatId) {
            return res.status(400).json({
                success: false,
                message: "Both userId and chatId are required fields",
            });
        }

        const removed = await Chat.findByIdAndUpdate(chatId,
            {
                $pull: { users: userId },
            },
            { new: true }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");

        if (!removed) {
            return res.status(400).json({
                success: false,
                message: "There was a problem removing the user from the group",
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "User removed successfully",
            data: removed,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error in removing the user from the group",
        });
    }
};

exports.leaveGroup = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;

        if (!chatId) {
            return res.status(400).json({
                success: false,
                message: "chatId is required",
            });
        }

        const chat = await Chat.findById(chatId);
        
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        if (!chat.isGroupChat) {
            return res.status(400).json({
                success: false,
                message: "Leave group is only available for group chats",
            });
        }

        if (!chat.users.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: "You are not a member of this group",
            });
        }

        if (chat.leftMembers && chat.leftMembers.includes(userId)) {
            return res.status(400).json({
                success: false,
                message: "You have already left this group",
            });
        }

        const user = await User.findById(userId).select("firstName lastName");
        
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            {
                $pull: { users: userId },
                $addToSet: { leftMembers: userId },
            },
            { new: true }
        )
        .populate("users", "-password")
        .populate("groupAdmin", "-password")
        .populate("leftMembers", "firstName lastName image");

        if (!updatedChat) {
            return res.status(500).json({
                success: false,
                message: "Failed to leave group",
            });
        }

        const systemMessage = await Message.create({
            sender: userId,
            content: `${user.firstName} ${user.lastName} left the group`,
            chat: chatId,
            isSystemMessage: true,
            status: "sent",
        });

        await Chat.findByIdAndUpdate(chatId, { latestMessage: systemMessage._id });

        const io = global.io;
        if (io && updatedChat.users) {
            updatedChat.users.forEach((groupUser) => {
                io.to(groupUser._id.toString()).emit("user left group", {
                    chatId,
                    userId,
                    message: systemMessage,
                    updatedChat,
                });
            });
        }

        return res.status(200).json({
            success: true,
            message: "Left group successfully",
            data: updatedChat,
            systemMessage,
        });
    } catch (error) {
        console.error("Leave group error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while leaving the group",
        });
    }
};

exports.deleteGroup = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;

        if (!chatId) {
            return res.status(400).json({
                success: false,
                message: "chatId is required",
            });
        }

        const chat = await Chat.findById(chatId);
        
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        if (!chat.isGroupChat) {
            return res.status(400).json({
                success: false,
                message: "Delete group is only available for group chats",
            });
        }

        if (chat.groupAdmin.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only group admin can delete the group",
            });
        }

        // ✅ Soft delete all messages in the chat (preserves chat history for recovery)
        await Message.softDeleteMany({ chat: chatId }, userId);
        
        // ✅ Soft delete the chat itself
        await Chat.softDeleteById(chatId, userId);

        const io = global.io;
        if (io && chat.users) {
            chat.users.forEach((groupUser) => {
                io.to(groupUser._id.toString()).emit("group deleted", {
                    chatId,
                    message: "This group has been deleted by the admin",
                });
            });
        }

        return res.status(200).json({
            success: true,
            message: "Group and all messages deleted successfully",
        });
    } catch (error) {
        console.error("Delete group error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while deleting the group",
        });
    }
};

exports.resetUnreadCount = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;

        if (!chatId) {
            return res.status(400).json({
                success: false,
                message: "chatId is required",
            });
        }

        const chat = await Chat.findById(chatId);
        
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        if (!chat.users.includes(userId)) {
            return res.status(403).json({
                success: false,
                message: "You are not a member of this chat",
            });
        }

        const updatedChat = await Chat.findOneAndUpdate(
            { _id: chatId, "unreadCounts.user": userId },
            { $set: { "unreadCounts.$.count": 0 } },
            { new: true }
        );

        if (!updatedChat) {
            await Chat.findByIdAndUpdate(
                chatId,
                { $push: { unreadCounts: { user: userId, count: 0 } } }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Unread count reset successfully",
        });
    } catch (error) {
        console.error("Reset unread count error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while resetting unread count",
        });
    }
};

exports.updateGroupPhoto = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;

        if (!chatId) {
            return res.status(400).json({
                success: false,
                message: "chatId is required",
            });
        }

        if (!req.files || !req.files.groupPhoto) {
            return res.status(400).json({
                success: false,
                message: "Group photo is required",
            });
        }

        const chat = await Chat.findById(chatId);
        
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found",
            });
        }

        if (!chat.isGroupChat) {
            return res.status(400).json({
                success: false,
                message: "This operation is only available for group chats",
            });
        }

        if (chat.groupAdmin.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: "Only group admin can update the group photo",
            });
        }

        // Upload new photo to Cloudinary
        const uploadedImage = await uploadFilesToCloudinary(
            [req.files.groupPhoto],
            "group_photos",
            { width: 500, height: 500, crop: "fill" }
        );

        const groupPhotoUrl = uploadedImage[0].secure_url;

        // Update chat with new photo
        const updatedChat = await Chat.findByIdAndUpdate(
            chatId,
            { groupPhoto: groupPhotoUrl },
            { new: true }
        )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

        // Create system message for photo update
        const admin = await User.findById(userId).select("firstName lastName");
        const systemMessage = await Message.create({
            sender: userId,
            content: `${admin.firstName} ${admin.lastName} updated the group photo`,
            chat: chatId,
            isSystemMessage: true,
        });

        await Chat.findByIdAndUpdate(chatId, { latestMessage: systemMessage._id });

        // Emit socket event to all group members
        const io = global.io;
        if (io && updatedChat.users) {
            updatedChat.users.forEach((user) => {
                io.to(user._id.toString()).emit("group photo updated", {
                    chatId,
                    groupPhoto: groupPhotoUrl,
                    message: systemMessage,
                    updatedChat,
                });
            });
        }

        return res.status(200).json({
            success: true,
            message: "Group photo updated successfully",
            groupPhoto: groupPhotoUrl,
            updatedChat,
        });
    } catch (error) {
        console.error("Update group photo error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating group photo",
        });
    }
};



