const { default: mongoose } = require("mongoose");
const Community = require("../models/Community");
const Post = require("../models/Post");
const User = require("../models/User");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");
const AdvertisedPost=require("../models/AdvertisedPost");
const Notification = require('../models/Notification');

  // Adjust the path if needed
// const NotificationController = require('../controllers/notificationController');
require("dotenv").config();

exports.createPost = async (req, res) => {
  try {
    const {
      postType,
      title,
      location,
      startDate,
      endDate,
      hostedBy,
      description,
      pollOptions,
    } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated.",
      });
    }

    // Basic post structure
    let postData = {
      postType,
      title: title || "",
      postByUser: userId,
    };

    // Poll post
    if (postType === "poll") {
      if (!pollOptions || pollOptions.length < 2) {
        return res.status(400).json({ error: "At least two poll options are required." });
      }
      postData.pollOptions = pollOptions.map(option => ({ option }));
    }

    // Event post
    else if (postType === "event") {
      if (!location || !startDate || !endDate || !hostedBy) {
        return res.status(400).json({ error: "Missing event details." });
      }
      postData = {
        ...postData,
        location,
        startDate,
        endDate,
        hostedBy,
        description,
      };

      const eventFiles = req.files?.media
        ? Array.isArray(req.files.media)
          ? req.files.media
          : [req.files.media]
        : [];

      if (eventFiles.length > 0) {
        const uploaded = await uploadFilesToCloudinary(eventFiles, process.env.FOLDER_NAME);
        postData.imgPath = uploaded.map(f => f.secure_url);
      }
    }

    // Normal post
    else {
      const postFiles = req.files?.media
        ? Array.isArray(req.files.media)
          ? req.files.media
          : [req.files.media]
        : [];

      if (postFiles.length === 0 && !title) {
        return res.status(400).json({
          success: false,
          message: "Title or media is required.",
        });
      }

      if (postFiles.length > 0) {
        const uploaded = await uploadFilesToCloudinary(postFiles, process.env.FOLDER_NAME);
        postData.imgPath = uploaded.map(f => f.secure_url);
      }
    }

    // Create post
    const post = await Post.create(postData);

    // Update user
    const userDetails = await User.findByIdAndUpdate(
      userId,
      { $push: { postByUser: post._id } },
      { new: true }
    ).populate("communityDetails", "userInCommunity communityName image city community");

    // Add post to community
    await Community.findByIdAndUpdate(userDetails.communityDetails._id, {
      $push: { posts: post._id },
    });

    // Notify community members (except sender)
    const members = userDetails.communityDetails.userInCommunity.filter(
      m => m.toString() !== userId.toString()
    );

    const notifications = members.map(member => ({
      recipient: member,
      sender: userId,
      post: post._id,
      type: postType,
      message: `${userDetails.firstName} created a new ${postType}: "${title?.substring(0, 30) || ''}..."`,
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);

      global.io.to(members.map(m => m.toString())).emit("newNotification", {
        sender: {
          _id: userDetails._id,
          firstName: userDetails.firstName,
          lastName: userDetails.lastName,
          image: userDetails.image,
        },
        post,
        notifications,
      });
    }

    // ✅ Emit real-time newPost to all users (frontend listener updates feed)
    global.io.emit("newPost", {
      ...post._doc,
      type: 0, // mark it as post (not ad)
      postByUser: {
        _id: userDetails._id,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        image: userDetails.image,
        communityDetails: userDetails.communityDetails,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Successfully created the post",
      postData: post,
    });
  } catch (error) {
    console.error("Error creating post:", error);
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

    const post = await Post.findById(postId).populate({
      path: 'pollOptions.votes',
      select: 'firstName lastName image'
    });

    if (!post) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    const voters = post.pollOptions[optionIndex]?.votes || [];

    res.status(200).json({
      success: true,
      voters,
    });

  } catch (error) {
    console.error('Error fetching voters:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


exports.getCommunityPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const userDetails = await User.findById(userId).populate({
      path: "additionalDetails",
      select: "dateOfBirth",
    });

    if (!userDetails || !userDetails.communityDetails) {
      return res.status(401).json({
        success: false,
        message: "User is not associated with any community",
      });
    }

    const communityId = userDetails.communityDetails;

    const community = await Community.findById(communityId)
      .select("posts advertisedPosts")
      .populate({
        path: "advertisedPosts",
        options: { sort: { createdAt: -1 } },
        populate: [
          {
            path: "createdBy",
            select: "firstName lastName email city state communityDetails image",
            populate: { path: "communityDetails", select: "communityName" },
          },
          { path: "like" },
          {
            path: "comments",
            populate: [
              {
                path: "commentedBy",
                select: "firstName lastName email city state communityDetails image",
                populate: { path: "communityDetails", select: "communityName" },
              },
              {
                path: "replies",
                populate: [
                  {
                    path: "repliedBy",
                    select: "firstName lastName email city state communityDetails image",
                    populate: { path: "communityDetails", select: "communityName" },
                  },
                ],
              },
            ],
          },
          { path: "communities", select: "communityName" },
          { path: "pageId" },
        ],
      });

    const totalNormalPosts = community.posts.length;
    const totalPages = Math.ceil(totalNormalPosts / limit);
    const paginatedPostIds = community.posts.slice().reverse().slice(skip, skip + limit);

    const posts = await Post.find({ _id: { $in: paginatedPostIds } })
      .populate([
        {
          path: "postByUser",
          select: "firstName lastName email city state communityDetails image",
          populate: { path: "communityDetails", select: "communityName community" },
        },
        {
          path: "likes",
          select: "firstName lastName email image",
        },
        {
          path: "comments",
          populate: [
            {
              path: "commentedBy",
              select: "firstName lastName email city state communityDetails image",
              populate: { path: "communityDetails", select: "communityName" },
            },
            {
              path: "replies",
              populate: [
                {
                  path: "repliedBy",
                  select: "firstName lastName email city state communityDetails image",
                  populate: { path: "communityDetails", select: "communityName" },
                },
              ],
            },
          ],
        },
            {
      path: "pollOptions.votes",
      select: "firstName lastName email image",
    },
      ])
      .sort({ createdAt: -1 });

    const currentDate = new Date();
    const userDOB = new Date(userDetails.additionalDetails?.dateOfBirth);
    const userAge = Math.floor((currentDate - userDOB) / (1000 * 60 * 60 * 24 * 365.25));

    const filteredAds = (community.advertisedPosts || [])
      .filter((ad) => {
        const start = new Date(ad.dateSlot?.startDate);
        const end = new Date(ad.dateSlot?.endDate);
        const minAge = ad.ageGroup?.minAge || 0;
        const maxAge = ad.ageGroup?.maxAge || 150;
        return (
          currentDate >= start &&
          currentDate <= end &&
          userAge >= minAge &&
          userAge <= maxAge
        );
      })
      .map((ad) => ({ ...ad._doc, type: 1 }));

    const normalPosts = posts.map((p) => ({ ...p._doc, type: 0 }));

    const combinedFeed = [];
    const AD_INTERVAL = 4;
    let postIndex = 0;
    let adIndex = 0;

    while (postIndex < normalPosts.length) {
      for (let i = 0; i < AD_INTERVAL && postIndex < normalPosts.length; i++) {
        combinedFeed.push(normalPosts[postIndex++]);
      }
      if (adIndex < filteredAds.length) {
        combinedFeed.push(filteredAds[adIndex++]);
      }
    }

    // Push remaining ads
    while (adIndex < filteredAds.length) {
      combinedFeed.push(filteredAds[adIndex++]);
    }

  

    return res.status(200).json({
      success: true,
      message: "Community posts fetched successfully",
      feed: combinedFeed,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching community posts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching posts",
    });
  }
};

// GET: /api/v1/post/preview/:postId
exports.getPostByIdForPreview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const postId = req.params.postId;

    // Basic auth check
    if (!userId) {
      return res.status(401).json({ success: false, message: "Login required" });
    }

    const user = await User.findById(userId).select("communityDetails");
    if (!user || !user.communityDetails) {
      return res.status(403).json({
        success: false,
        message: "You must join a community to view this post.",
      });
    }

    const post = await Post.findById(postId)
      .populate("postByUser", "firstName lastName image")
      .populate("likes", "_id")
      .lean();

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Minimal preview content
    const preview = {
      _id: post._id,
      title: post.content?.slice(0, 120) || "",
      image: post.image?.[0] || null,
      postedBy: post.postByUser,
      likes: post.likes.length,
      createdAt: post.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Post preview fetched",
      post: preview,
    });
  } catch (error) {
    console.error("Error in post preview:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 📁 controllers/Post.js
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("postByUser", "firstName lastName image");
    
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    res.status(200).json({ success: true, post });
  } catch (err) {
    console.error("❌ Error in getPostById:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
      
      // if (!postIds.length) {
      //     return res.status(404).json({ message: "No posts found in user's communities." });
      // }

      // Find posts with postType "events"
      const events = await Post.find({
        _id: { $in: postIds }, // Get posts by extracted post IDs
        postType: "event"
      })
        .populate("postByUser", "name")
        .sort({ createdAt: -1 }); // Corrected syntax for sorting
       // Populate user name if needed

      // if (!events.length) {
      //     return res.status(404).json({ message: "No events found in user's communities." });
      // }

      res.status(200).json(events);
  } catch (error) {
      console.error("Error fetching community events:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    if (!postId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Post ID and User ID are required.",
      });
    }

    // Step 1: Fetch and validate the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    // Step 2: Check ownership
    const user = await User.findById(userId);
    if (!user.postByUser.includes(postId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete this post.",
      });
    }

    // Step 3: Remove post reference from user
    user.postByUser = user.postByUser.filter(id => id.toString() !== postId);
    await user.save();

    // Step 4: Remove post from community
    await Community.findByIdAndUpdate(user.communityDetails, {
      $pull: { posts: postId }
    });

    // Step 5: Delete associated notifications
    await Notification.deleteMany({ post: postId });

    // Step 6: Delete the post (along with embedded comments/replies)
    await Post.findByIdAndDelete(postId);

    // Step 7: Emit real-time update to community
    global.io.to(user.communityDetails.toString()).emit("postDeleted", { postId });

    return res.status(200).json({
      success: true,
      message: "Post and all related data deleted successfully.",
    });

  } catch (error) {
    console.error("Error deleting post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting post.",
    });
  }
};


exports.updatePost = async (req, res) => {
  try {
    console.log(req.body);
    const { postId, title, description, location, startDate, endDate, hostedBy } = req.body;
    const userId = req.user.id;

    if (!postId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Post ID and User ID are required.",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    if (post.postByUser.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to update this post.",
      });
    }

    // Update editable fields
    if (title !== undefined) post.title = title;
    if (description !== undefined) post.description = description;
    if (post.postType === "event") {
      if (location) post.location = location;
      if (startDate) post.startDate = startDate;
      if (endDate) post.endDate = endDate;
      if (hostedBy) post.hostedBy = hostedBy;
    }

    // If media files are present (image/video), update them
    const mediaFiles = req.files ? (Array.isArray(req.files.media) ? req.files.media : [req.files.media]) : [];

    if (mediaFiles.length > 0) {
      const uploadDetails = await uploadFilesToCloudinary(mediaFiles, process.env.FOLDER_NAME);
      post.imgPath = uploadDetails.map(file => file.secure_url);
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      updatedPost: post,
    });

  } catch (error) {
    console.error("Error updating post:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating post.",
    });
  }
};



exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params; // using route parameter
    // Ensure that the post type is "event"
    const event = await Post.findOne({ _id: id, postType: 'event' })
      .populate('postByUser', 'firstName lastName email')
      .exec();

    if (!event) {
      console.log("Event not found");
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    
    return res.status(200).json({ success: true, event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return res.status(500).json({ success: false, message: "Server error", error });
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
