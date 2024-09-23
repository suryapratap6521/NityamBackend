const { default: mongoose } = require("mongoose");
const Community = require("../models/Community");
const Post = require("../models/Post");
const User = require("../models/User");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");
require("dotenv").config();


exports.createPost = async (req, res) => {
  try {
      const { title } = req.body;
      const userId = req.user.id;

      if (!userId) {
          return res.status(404).json({
              success: false,
              message: "User is not registered",
          });
      }

     // Check if files are present
     const postFiles = req.files ? (Array.isArray(req.files.postFiles) ? req.files.postFiles : [req.files.postFiles]) : [];

     // If there are no files and no title, return an error
     if (postFiles.length === 0 && !title) {
         return res.status(400).json({
             success: false,
             message: "Either title or any image or video is required",
         });
     }

     // Upload files to Cloudinary if present
     let uploadDetails = [];
     if (postFiles.length > 0) {
         uploadDetails = await uploadFilesToCloudinary(postFiles, process.env.FOLDER_NAME);
     }

      // Create post with the uploaded file URLs
      const post = await Post.create({
          title: title || "Untitled",
          imgPath: uploadDetails.map(detail => detail.secure_url) || [],
          postByUser: userId,
      });

      await User.findByIdAndUpdate(userId, { $push: { postByUser: post._id } });

      const userDetails = await User.findById(userId).populate("postByUser");
      const communityDetails = await Community.findByIdAndUpdate(
          { _id: userDetails.communityDetails },
          { $push: { posts: post._id } },
          { new: true }
      ).populate("posts");

      return res.status(200).json({
          success: true,
          message: "Successfully created the post",
          data: post,
      });
  } catch (error) {
      console.error(error);
      return res.status(500).json({
          success: false,
          message: "Internal server error",
      });
  }
};



exports.getAllPosts = async (req, res) => {
  try {
    const allPost = await Post.find({}, { title: true })
      .populate("postByUser")
      .populate("likes")
      // .populate('commentsOnPost')
      .exec();

    return res.status(200).json({
      success: true,
      posts: allPost,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.getCommunityPost = async (req, res) => {
  try {
    // Get the user ID from the request
    const userId = req.user.id;
    

    // Find user details by ID
    const userDetails = await User.findById(userId);

    if (!userDetails || !userDetails.communityDetails) {
      return res.status(401).json({
        success: false,
        message: "User is not associated with any community or there are no posts to be shown",
      });
    }

    const communityId = userDetails.communityDetails;

    const communityDetails = await Community.findById(communityId)
      .populate({
        path: "posts",
        populate: [
          {
            path: "postByUser",
            select: "firstName lastName email city state community image",
            populate: { path: "communityDetails" }
          },
          {
            path: "like"
          },
          {
            path: "comments",
            populate: [
              {
                path: "commentedBy",
                select: "firstName lastName email city state communityDetails image",
                populate: { path: "communityDetails" }
              },
              
              {
                path: "replies",
                populate: [
                  {
                    path: "repliedBy",
                    select: "firstName lastName email city state communityDetails image",
                    populate: { path: "communityDetails" }
                  },
                  
                ]
              }
            ]
          }
        ]
      })
      .exec();

    const communityPost = communityDetails.posts;

   

    // Send response with community posts
    return res.status(200).json({
      success: true,
      message: "Successfully retrieved all community posts",
      communityPost,
    });
  } catch (error) {
    // Handle errors
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in retrieving community posts",
    });
  }
};



//////////////////////////////////////////////////////////////////////////////
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.body; // Access postId from the request parameters
    const userId = req.user.id;

    if (!postId || !userId) {
      return res.status(404).json({
        success: false,
        message: "Post or user ID is missing",
      });
    }

    // Check if the post exists
    const postDetails = await Post.findById(postId);
    if (!postDetails) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if the user is the creator of the post
    const userDetails = await User.findById(userId);
    if (!userDetails.postByUser.includes(postId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this post",
      });
    }

    // Remove the post from the user's postByUser array
    userDetails.postByUser = userDetails.postByUser.filter(
      (post) => post.toString() !== postId
    );
    await userDetails.save();
    //remove the postId from community Posts
    //remove the postId from community Posts
    await Community.findByIdAndUpdate(userDetails.communityDetails, {
      $pull: { posts: postId }
    }).exec();



    // Delete the post
    await Post.findByIdAndDelete(postId);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server error in deleting post",
    });
  }
};
