const Post = require("../models/Post");
const User = require("../models/User");
const { ShareEvent, ShareClick } = require("../models/ShareAnalytics");

// GET /api/v1/share/post/:postId
// Public endpoint - no authentication required
// Returns sanitized post data for public preview
exports.getPublicPost = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate({
        path: "postByUser",
        select: "firstName lastName image communityDetails",
        populate: {
          path: "communityDetails",
          select: "communityName city",
        },
      })
      .select("title description imgPath postType createdAt likes comments pollOptions pollQuestion eventDetails")
      .lean();

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Return sanitized data (no sensitive info)
    const publicPost = {
      _id: post._id,
      title: post.title || null,
      description: post.description || null, // Full description for "read more"
      imgPath: post.imgPath || [], // All images/videos
      postType: post.postType,
      author: {
        firstName: post.postByUser.firstName,
        lastName: post.postByUser.lastName,
        image: post.postByUser.image,
      },
      community: post.postByUser.communityDetails?.communityName || "Unknown",
      likes: post.likes || [],
      comments: post.comments || [],
      createdAt: post.createdAt,
    };

    // Add poll data if poll
    if (post.postType === "poll" && post.pollOptions?.length > 0) {
      publicPost.pollQuestion = post.pollQuestion;
      publicPost.pollOptions = post.pollOptions.map(opt => ({
        option: opt.option,
        votes: opt.votes || [],
      }));
    }

    // Add event data if event
    if (post.postType === "event" && post.eventDetails) {
      publicPost.eventDetails = {
        startDate: post.eventDetails.startDate,
        endDate: post.eventDetails.endDate,
        startTime: post.eventDetails.startTime,
        endTime: post.eventDetails.endTime,
        location: post.eventDetails.location,
      };
    }

    res.status(200).json({
      success: true,
      post: publicPost,
    });
  } catch (error) {
    console.error("❌ Error fetching public post:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /api/v1/share/post/:postId/metadata
// Returns Open Graph metadata for rich link previews
exports.getShareMetadata = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate({
        path: "postByUser",
        select: "firstName lastName communityDetails",
        populate: {
          path: "communityDetails",
          select: "communityName",
        },
      })
      .select("title description imgPath postType pollQuestion eventDetails")
      .lean();

    if (!post || post.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    let title = "Check out this post on TruePadosi";
    let description = "Join the community conversation";

    // Customize based on post type
    if (post.postType === "event") {
      title = post.title || "Join this event on TruePadosi 🎉";
      description = post.description?.substring(0, 160) || "Community event";
    } else if (post.postType === "poll") {
      title = post.pollQuestion || "Vote in this poll on TruePadosi 📊";
      description = post.description?.substring(0, 160) || "Community poll";
    } else if (post.postType === "advertisement") {
      title = post.title || "Check out this offer on TruePadosi 💼";
      description = post.description?.substring(0, 160) || "Community advertisement";
    } else {
      title = post.title || `Post by ${post.postByUser.firstName} ${post.postByUser.lastName}`;
      description = post.description?.substring(0, 160) || "Community post";
    }

    const metadata = {
      title,
      description,
      image: post.imgPath?.[0] || "https://truepadosi.com/default-share-image.jpg",
      url: `https://truepadosi.com/post/${postId}`,
      author: `${post.postByUser.firstName} ${post.postByUser.lastName}`,
      community: post.postByUser.communityDetails?.communityName || "TruePadosi",
      type: post.postType,
    };

    res.status(200).json({
      success: true,
      metadata,
    });
  } catch (error) {
    console.error("❌ Error fetching share metadata:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// POST /api/v1/share/track
// Track share events (when user clicks share button)
exports.trackShare = async (req, res) => {
  try {
    const { postId, platform } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    // Optional authentication - if user is logged in, track who shared
    const userId = req.user?.id || null;

    await ShareEvent.create({
      postId,
      sharedBy: userId,
      platform: platform || "unknown",
    });

    res.status(200).json({
      success: true,
      message: "Share event tracked",
    });
  } catch (error) {
    console.error("❌ Error tracking share:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// POST /api/v1/share/click
// Track click events (when someone opens a shared link)
exports.trackClick = async (req, res) => {
  try {
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    await ShareClick.create({
      postId,
      userAgent: req.headers["user-agent"],
      referer: req.headers["referer"] || req.headers["referrer"],
      ipAddress: req.ip || req.connection.remoteAddress,
    });

    res.status(200).json({
      success: true,
      message: "Click tracked",
    });
  } catch (error) {
    console.error("❌ Error tracking click:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// GET /api/v1/share/analytics/:postId
// Get analytics for a specific post (requires authentication)
exports.getPostAnalytics = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Verify user owns the post
    const post = await Post.findById(postId).select("postByUser").lean();
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.postByUser.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view analytics for this post",
      });
    }

    // Get share events
    const shareEvents = await ShareEvent.find({ postId }).lean();
    const totalShares = shareEvents.length;

    // Platform breakdown
    const platformStats = shareEvents.reduce((acc, event) => {
      acc[event.platform] = (acc[event.platform] || 0) + 1;
      return acc;
    }, {});

    // Get click events
    const clickEvents = await ShareClick.find({ postId }).lean();
    const totalClicks = clickEvents.length;

    // Conversion rate
    const conversionRate = totalShares > 0 
      ? ((totalClicks / totalShares) * 100).toFixed(2) 
      : "0.00";

    res.status(200).json({
      success: true,
      analytics: {
        postId,
        totalShares,
        platforms: platformStats,
        totalClicks,
        conversionRate: `${conversionRate}%`,
        shareTimeline: shareEvents.map(e => ({
          platform: e.platform,
          timestamp: e.timestamp,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching analytics:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
