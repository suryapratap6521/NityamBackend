const Services = require('../models/Services');
const User = require("../models/User");
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
        const allUsers = await User.find({}).populate({
            path: 'services',
        })
        .populate({
            path:"communityDetails",
        })
        const userMadeServices= await Services.find({}).populate({
            path:"createdBy",
            populate:{
                path:"communityDetails",
            }
        });
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


exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;  // using route parameter
    const service = await Services.findById(id)
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email',
        populate: {
          path: 'communityDetails',
          select: 'communityName'
        }
      })
      .exec();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      });
    }

    return res.status(200).json({
      success: true,
      service,
    });
  } catch (error) {
    console.error("Error fetching service:", error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};