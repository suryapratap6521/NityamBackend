const Page = require("../models/Page"); 
const { uploadFilesToCloudinary } = require("../utils/imageUploader"); 

exports.createPage = async (req, res) => {
  try {
    // Ensure all required fields are present
    const {
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      businessAddress,
      businessCity,
      businessPostCode,
    } = req.body;

    if (
      !businessName ||
      !businessCategory ||
      !businessDescription ||
      !businessPhoneNumber ||
      !businessEmail
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Validate file presence
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

    if (!imageUploadResult || !imageUploadResult.secure_url) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload the profile picture.",
      });
    }

    // Create a new page document with the provided data and Cloudinary URL
    const newPage = new Page({
      businessName,
      businessCategory,
      businessDescription,
      businessUrl,
      businessPhoneNumber,
      businessEmail,
      businessAddress,
      businessCity,
      businessPostCode,
      businessProfilePicture: imageUploadResult.secure_url,
    });

    // Save the new page to the database
    const savedPage = await newPage.save();

    // Respond with success and return the saved page
    return res.status(201).json({
      success: true,
      message: "Business page created successfully.",
      data: savedPage,
    });
  } catch (error) {
    console.error("Error in createPage:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
