const { default: mongoose } = require("mongoose");
const Community = require("../models/Community");
const Post = require("../models/Post");
const User = require("../models/User");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");
const AdvertisedPost=require("../models/AdvertisedPost");
const Notification = require('../models/Notification');  // Adjust the path if needed

// const NotificationController = require('../controllers/notificationController');
require("dotenv").config();


// exports.createPost = async (req, res) => {
//   try {
//       const { title,postType,eventName,location,startDate,EndDate,hostedBy,venue } = req.body;
//       const userId = req.user.id;

      

//       if (!userId) {
//           return res.status(404).json({
//               success: false,
//               message: "User is not registered",
//           });
//       }

//      // Check if files are present
//      const postFiles = req.files ? (Array.isArray(req.files.postFiles) ? req.files.postFiles : [req.files.postFiles]) : [];

//      // If there are no files and no title, return an error
//      if (postFiles.length === 0 && !title) {
//          return res.status(400).json({
//              success: false,
//              message: "Either title or any image or video is required",
//          });
//      }

//      // Upload files to Cloudinary if present
//      let uploadDetails = [];
//      if (postFiles.length > 0) {
//          uploadDetails = await uploadFilesToCloudinary(postFiles, process.env.FOLDER_NAME);
//      }

//       // Create post with the uploaded file URLs
//       const post = await Post.create({
//           title: title || "Untitled",
//           imgPath: uploadDetails.map(detail => detail.secure_url) || [],
//           postByUser: userId,
//       });

//       await User.findByIdAndUpdate(userId, { $push: { postByUser: post._id } });

//       const userDetails = await User.findById(userId).populate("postByUser");
//       const communityDetails = await Community.findByIdAndUpdate(
//           { _id: userDetails.communityDetails },
//           { $push: { posts: post._id } },
//           { new: true }
//       ).populate("posts");

//       return res.status(200).json({
//           success: true,
//           message: "Successfully created the post",
//           data: post,
//       });
//   } catch (error) {
//       console.error(error);
//       return res.status(500).json({
//           success: false,
//           message: "Internal server error",
//       });
//   }
// };


// createPost controller for handling media files in both posts and events
// controllers/Post.js

console.log(Notification,"-------------asdasdas")
exports.createPost = async (req, res) => {
  try {
    const { postType, title, location, startDate, endDate, hostedBy, venue, description, pollOptions } = req.body;
    const userId = req.user.id;
    console.log(req.body);

    if (!userId) {
      return res.status(404).json({
        success: false,
        message: "User is not registered",
      });
    }

    let postData = { postType, title: title || "", postByUser: userId };

    if (postType === 'poll') {
      if (!pollOptions || pollOptions.length < 2) {
        return res.status(400).json({ error: 'At least two poll options are required.' });
      }
      postData.pollOptions = pollOptions.map(option => ({ option }));
    } else if (postType === 'event') {
      if (!location || !startDate || !endDate || !hostedBy || !venue) {
        return res.status(400).json({ error: 'Event details are required.' });
      }
      postData = { ...postData, location, startDate, endDate, hostedBy, venue, description };
      const eventFiles = req.files ? (Array.isArray(req.files.media) ? req.files.media : [req.files.media]) : [];
      if (eventFiles.length > 0) {
        const uploadDetails = await uploadFilesToCloudinary(eventFiles, process.env.FOLDER_NAME);
        postData.imgPath = uploadDetails.map(detail => detail.secure_url);
      }
    } else {
      const postFiles = req.files ? (Array.isArray(req.files.media) ? req.files.media : [req.files.media]) : [];
      if (postFiles.length === 0 && !title) {
        return res.status(400).json({
          success: false,
          message: "Either title or any image or video is required",
        });
      }
      if (postFiles.length > 0) {
        const uploadDetails = await uploadFilesToCloudinary(postFiles, process.env.FOLDER_NAME);
        postData.imgPath = uploadDetails.map(detail => detail.secure_url);
      }
    }

    const post = await Post.create(postData);
    const userDetails = await User.findByIdAndUpdate(userId, { $push: { postByUser: post._id } });
    await Community.findByIdAndUpdate(
      { _id: userDetails.communityDetails },
      { $push: { posts: post._id } },
      { new: true }
    ).populate("posts");

    // const notificationMessage = `${userDetails.firstName} ${userDetails.lastName} created a new ${postType} in your community.`;

    // Send notification via socket to all users in the community
   // Emit notification to community members
// global.io.to(userDetails.communityDetails).emit("newNotification", {
//   message: notificationMessage,
//   postType,
//   postId: post._id,
// });

    // console.log("Notification emitted to room:", userDetails.communityDetails);

// Add at top


// Inside createPost function after community update:
const community = await Community.findById(userDetails.communityDetails)
  .select('userInCommunity')
  .populate('userInCommunity')
  .exec();

const members = community.userInCommunity.filter(member => member._id.toString() !== userId.toString());

const notifications = members.map(member => ({
  recipient: member._id,
  sender: userId,
  post: post._id,
  type: postType,
  message: `${userDetails.firstName} created a new ${postType}: "${title.substring(0, 30)}..."`
}));


if (notifications.length > 0) {
  await Notification.insertMany(notifications);

  global.io.to(members.map(m => m._id.toString())).emit("newNotification", {
    sender: userDetails,
    post: post,
    notifications,
  });
}



    return res.status(200).json({
      success: true,
      message: "Successfully created the post",
      postData: post,
    });

  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Add these endpoints
exports.voteOnPoll = async (req, res) => {
  try {
    const { postId } = req.params;
    const { optionIndex } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post || post.postType !== 'poll') {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Remove existing votes
    post.pollOptions.forEach(option => {
      option.votes = option.votes.filter(vote => vote.toString() !== userId);
    });

    // Add new vote
    post.pollOptions[optionIndex].votes.push(userId);
    await post.save();

    // Populate voter details
    const populatedPost = await Post.findById(postId).populate({
      path: 'pollOptions.votes',
      select: 'firstName lastName image'
    });

    res.status(200).json({
      success: true,
      updatedPoll: populatedPost.pollOptions
    });

  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getVoters = async (req, res) => {
  try {
    const { postId, optionIndex } = req.params;
    
    const post = await Post.findById(postId)
      .populate({
        path: `pollOptions.${optionIndex}.votes`,
        select: 'firstName lastName image'
      });

    if (!post) return res.status(404).json({ error: 'Poll not found' });

    res.status(200).json({
      success: true,
      voters: post.pollOptions[optionIndex].votes
    });

  } catch (error) {
    console.error('Error fetching voters:', error);
    res.status(500).json({ error: 'Internal server error' });
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
                }
              ]
            }
          ]
        }
      ]
    })
    .populate({
      path: "advertisedPosts",
      populate: [
        {
          path: "createdBy",
          select: "firstName lastName email city state communityDetails image",
          populate: { path: "communityDetails" }
        },
        {
          path: "like",
          select: "firstName lastName email image" // Assuming you want basic user details for likes
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
                }
              ]
            }
          ]
        },
        {
          path: "communities",
          select: "communityName" // Populating community details if required
        },
        {
          path: "pageId",
          select: "name description image", // Replace with fields available in the `Page` schema
        }
      ]
    })
    .exec();
  
  const communityPost = communityDetails.posts;
  const communityAdvertisedPosts = communityDetails.advertisedPosts;
  

   

    // Send response with community posts
    return res.status(200).json({
      success: true,
      message: "Successfully retrieved all community posts",
      communityPost,
      communityAdvertisedPosts,
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

exports.getCommunityEvents = async (req, res) => {
  try {
      const userId = req.user.id; // Get user ID from authentication middleware
      
      // Find communities where the user is a member
      const communities = await Community.find({ userInCommunity: userId });

      if (!communities.length) {
          return res.status(404).json({ message: "User is not part of any community." });
      }

      // Extract all post IDs from the user's communities
      const postIds = communities.flatMap(community => community.posts);
      
      if (!postIds.length) {
          return res.status(404).json({ message: "No posts found in user's communities." });
      }

      // Find posts with postType "events"
      const events = await Post.find({
          _id: { $in: postIds },  // Get posts by extracted post IDs
          postType: "event"
      }).populate("postByUser", "name") // Populate user name if needed

      if (!events.length) {
          return res.status(404).json({ message: "No events found in user's communities." });
      }

      res.status(200).json(events);
  } catch (error) {
      console.error("Error fetching community events:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};






//////////////////////////////////////////////////////////////////////////////
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.body; // Access postId from the request parameters
    const userId = req.user.id;

    console.log(userId,"-->user");
    console.log(postId,"-->post");

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






exports.createAdv = async (req, res) => {
  try {
    const { optionType, states, cities, communities, postId } = req.body;

    if (!postId) {
      return res.status(400).json({ message: "Post ID is required." });
    }

    let selectedCommunities = [];

    switch (optionType) {
      case "allUsers":
        selectedCommunities = await Community.find({});
        break;

      case "byState":
        if (!states || !Array.isArray(states) || states.length === 0) {
          return res.status(400).json({ message: "States are required for this option." });
        }
        selectedCommunities = await Community.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userInCommunity",
              foreignField: "_id",
              as: "userDetails",
            },
          },
          {
            $match: {
              "userDetails.state": { $in: states },
            },
          },
        ]);
        break;

      case "byCity":
        if (!cities || !Array.isArray(cities) || cities.length === 0) {
          return res.status(400).json({ message: "Cities are required for this option." });
        }
        selectedCommunities = await Community.find({ city: { $in: cities } });
        break;

      case "byCommunity":
        if (!communities || !Array.isArray(communities) || communities.length === 0) {
          return res.status(400).json({ message: "Communities are required for this option." });
        }
        selectedCommunities = await Community.find({ communityName: { $in: communities } });
        break;

      default:
        return res.status(400).json({ message: "Invalid option type." });
    }

    if (selectedCommunities.length === 0) {
      return res.status(404).json({ message: "No communities found for the selected criteria." });
    }

    // Add the post ID to the advertisedPosts array of each community
    const updatedCommunities = await Promise.all(
      selectedCommunities.map(async (community) => {
        // If using aggregate, re-fetch as a Mongoose document
        if (!community.save) {
          community = await Community.findById(community._id);
        }

        if (community && !community.advertisedPosts.includes(postId)) {
          community.advertisedPosts.push(postId);
          return community.save();
        }
        return community;
      })
    );

    res.status(200).json({
      message: "Post added to communities successfully.",
      communities: updatedCommunities,
    });
  } catch (error) {
    console.error("Error adding post to communities:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
