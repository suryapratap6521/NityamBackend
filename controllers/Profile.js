const Profile = require("../models/Profile")
const User = require("../models/User")
const { uploadFilesToCloudinary } = require("../utils/imageUploader")
const mongoose = require("mongoose")

// Method for updating a profile
exports.updateProfile = async (req, res) => {
  try {
      const { additionalDetails } = req.body;
      const id = req.user.id;

      const user = await User.findById(id)
          .populate("additionalDetails")
          .exec();

      // Merge existing details with updates
      const updatedDetails = {
          ...user.additionalDetails._doc,
          ...additionalDetails
      };

      const profile = await Profile.findByIdAndUpdate(
          user.additionalDetails._id,
          updatedDetails,
          { new: true }
      );

      // Return full user data
      const updatedUser = await User.findById(id)
          .populate("additionalDetails")
          .exec();

      res.json({
          success: true,
          message: "Profile updated successfully",
          updatedUserDetails: updatedUser
      });
  } catch (error) {
      console.log(error);
      return res.status(500).json({
          success: false,
          error: error.message,
      });
  }
};


  exports.deleteAccount = async (req, res) => {
    try {
      const id = req.user.id
      console.log(id)
      const user = await User.findById({ _id: id })
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        })
      }
     
// ****************************************


// Delete all the post created by the user-----pending

// *****************************************

      // Now Delete User
      await User.findByIdAndDelete({ _id: id })
      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      })
      // await CourseProgress.deleteMany({ userId: id }) ye abhi krna h 
    } catch (error) {
      console.log(error)
      res
        .status(500)
        .json({ success: false, message: "User Cannot be deleted successfully" })
    }
  }


  exports.getAllUserDetails = async (req, res) => {
    try {
      const id = req.user.id
      const userDetails = await User.findById(id)
        .populate("additionalDetails")
        .exec()
      console.log(userDetails)
      res.status(200).json({
        success: true,
        message: "User Data fetched successfully",
        data: userDetails,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }
  
  exports.updateDisplayPicture = async (req, res) => {
    try {
      const displayPicture = req.files.displayPicture
      const userId = req.user.id
      const image = await uploadFilesToCloudinary(
        displayPicture,
        process.env.FOLDER_NAME,
      
      )
      
      const updatedProfile = await User.findByIdAndUpdate(
        { _id: userId },
        { image: image[0].secure_url },
        { new: true }
      )
      res.send({
        success: true,
        message: `Image Updated successfully`,
        data: updatedProfile,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }
  