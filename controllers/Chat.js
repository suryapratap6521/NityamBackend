const Chat = require("../models/Chat");

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
        const result = await Chat.find({ users: req.user.id })
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
            .sort({ updatedAt: -1 })
            .populate('groupAdmin', '-password');

        return res.status(200).json({
            success: true,
            message: 'Fetching all chats',
            chat: result
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
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: groupAdmin, // Set groupAdmin to the current user's ObjectId
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
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

        const added = await Chat.findByIdAndUpdate(chatId,
            {
                $push: { users: userId },
            },
            { new: true }
        ).populate("users", "-password")
            .populate("groupAdmin", "-password");

        if (!added) {
            return res.status(400).json({
                success: false,
                message: "There was a problem adding the user to the group",
            });
        }
        
        return res.status(200).json({
            success: true,
            message: "User added successfully",
            data: added,
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



