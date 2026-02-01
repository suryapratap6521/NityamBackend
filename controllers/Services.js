const Services = require('../models/Services');
const User = require("../models/User");
const Chat = require('../models/Chat');
const { uploadFilesToCloudinary } = require("../utils/imageUploader")


exports.createService = async (req, res) => {
    const { firstName, lastName, profession, phoneNumber, address, price } = req.body;
    try {
      const userId = req.user.id;
      let serImgUrl = null;
  
      if (req.files && req.files.serviceImage) {
        const serviceImage = req.files.serviceImage;
        const serImgs = await uploadFilesToCloudinary(serviceImage, process.env.FOLDER_NAME);
        serImgUrl = serImgs[0].secure_url;
      }
  
      const service = await Services.create({
        firstName, 
        lastName, 
        profession, 
        image: serImgUrl, 
        phoneNumber, 
        address, 
        price,
        createdBy: userId,
      });
  
      await User.findByIdAndUpdate(userId, { $push: { services: service._id } });
  
      const user = await User.findById(userId)
        .populate("services")
        .populate("communityDetails");
  
      return res.status(201).json({
        success: true,
        message: "Service created",
        user,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  


exports.getServices = async (req, res) => {
    try {
        const userId = req.user?.id;

        // ✅ Fetch all existing 1-1 chats for current user once
        let chatMap = new Map();
        if (userId) {
            const directChats = await Chat.find({
                isGroupChat: false,
                users: userId
            }).select('users _id').lean();

            directChats.forEach(chat => {
                const otherUser = chat.users?.find(u => u.toString() !== userId.toString());
                if (otherUser) {
                    chatMap.set(otherUser.toString(), chat._id);
                }
            });
        }

        const allUsersRaw = await User.find({})
            .populate({ path: 'services' })
            .populate({ path: 'communityDetails' })
            .lean();

        const userMadeServicesRaw = await Services.find({})
            .populate({
                path: 'createdBy',
                populate: { path: 'communityDetails' }
            })
            .lean();

        const allUsers = allUsersRaw.map(user => ({
            ...user,
            chatId: chatMap.get(user._id.toString()) || null
        }));

        const userMadeServices = userMadeServicesRaw.map(service => ({
            ...service,
            chatId: service.createdBy?._id ? (chatMap.get(service.createdBy._id.toString()) || null) : null
        }));

        return res.status(200).json({
            success: true,
            message: "Fetched all services",
            allUsers,
            userMadeServices
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

exports.getServicesByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate({
        path: "services",
      })
      .populate({
        path: "communityDetails",
        select: "communityName",
      });

    if (!user) {
      // Try to find a service by this ID
      const service = await Services.findById(userId).populate({
        path: "createdBy",
        select: "firstName lastName email profession hourlyCharge communityDetails",
        populate: { path: "communityDetails", select: "communityName" }
      });
      console.log(service);
      if (service) {
        return res.status(200).json({
          success: true,
          service,
        });
      }
      return res.status(404).json({
        success: false,
        message: "User or Service not found",
      });
    }

    return res.status(200).json({
      success: true,
      services: user.services,
      user, // if you also want user details in modal
    });
  } catch (error) {
    console.error("Error fetching user services:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
