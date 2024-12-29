const Page = require("../models/Page");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");

exports.createPage = async (req, res) => {
  try {

    // Destructure and validate required fields
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
      !businessPhoneNumber ||
      !businessEmail||
      !businessAddress||
      !businessCity||
      !businessPostCode
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided.",
      });
    }

    // Check for the presence of profile picture
    if (!req.files || !req.files.businessProfilePicture) {
      return res.status(400).json({
        success: false,
        message: "Profile picture is required.",
      });
    }

    const businessProfilePicture = req.files.businessProfilePicture;

    // Log file details for debugging
    // console.log("Uploaded File:", businessProfilePicture);

    // Upload the profile picture to Cloudinary
    const [imageUploadResult] = await uploadFilesToCloudinary(
      [businessProfilePicture], // Ensure it's treated as an array
      process.env.FOLDER_NAME
    );

    if (!imageUploadResult || !imageUploadResult.secure_url) {
      return res.status(500).json({
        success: false,
        message: "Failed to upload the profile picture.",
      });
    }

    // Create a new page with uploaded image URL and other details
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

    // Respond with success and return the saved page data
    return res.status(201).json({
      success: true,
      message: "Business page created successfully.",
      data: savedPage,
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error("Error in createPage:", error);

    // Respond with a generic error message
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
