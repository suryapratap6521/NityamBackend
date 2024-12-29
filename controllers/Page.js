const Page = require("../models/Page"); 
const {uploadFilesToCloudinary} = require("../utils/imageUploader"); 

exports.createPage = async (req, res) => {
  try {
    // Extract business details from the request body
    const {
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      business,
      businessAddress,
      businessCity,
      businessPostCode,
    } = req.body;

    // Check if the profile picture is included in the request
    if (!req.files || !req.files.businessProfilePicture) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required.",
      });
    }

    // Upload the profile picture to Cloudinary
    const businessProfilePicture = req.files.businessProfilePicture;
    const imageUploadResult = await uploadFilesToCloudinary(
      businessProfilePicture,
      process.env.FOLDER_NAME
    );

    // Create a new page document with the Cloudinary URL
    const newPage = new Page({
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      business,
      businessAddress,
      businessCity,
      businessPostCode,
      businessProfilePicture: imageUploadResult.secure_url, 
    });

    // Save the new page to the database
    const savedPage = await newPage.save();

    // Respond with success
    return res.status(201).json({
      success: true,
      message: "Business page created successfully.",
      data: savedPage,
    });
  } catch (error) {
    console.error("Error in addProfile:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
