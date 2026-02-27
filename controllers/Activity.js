const Post = require("../models/Post");
const User = require("../models/User");

// GET /api/v1/activity/posts?page=1&limit=10
// Returns paginated posts created by the authenticated user
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments({ postByUser: userId });
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await Post.find({ postByUser: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "postByUser",
        select: "firstName lastName email image city state communityDetails",
        populate: {
          path: "communityDetails",
          select: "communityName community city image",
        },
      })
      .populate({
        path: "likes",
        select: "firstName lastName email image",
      })
      .populate({
        path: "comments.commentedBy",
        select: "firstName lastName email image",
        populate: { path: "communityDetails", select: "communityName" },
      })
      .populate({
        path: "pollOptions.votes",
        select: "firstName lastName email image",
      })
      .lean();

    return res.status(200).json({
      success: true,
      posts: posts.map((p) => ({ ...p, type: 0 })),
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user posts",
    });
  }
};

// GET /api/v1/activity/comments?page=1&limit=10
// Returns paginated comments made by the authenticated user, with parent post context
exports.getUserComments = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find all posts that contain at least one comment by this user
    const postsWithUserComments = await Post.find({
      "comments.commentedBy": userId,
    })
      .populate({
        path: "postByUser",
        select: "firstName lastName email image city state communityDetails",
        populate: {
          path: "communityDetails",
          select: "communityName community city image",
        },
      })
      .populate({
        path: "comments.commentedBy",
        select: "firstName lastName email image communityDetails",
        populate: { path: "communityDetails", select: "communityName" },
      })
      .populate({
        path: "likes",
        select: "firstName lastName email image",
      })
      .populate({
        path: "pollOptions.votes",
        select: "firstName lastName email image",
      })
      .lean();

    // Extract individual comments by the user with their parent post context
    const allUserComments = [];

    for (const post of postsWithUserComments) {
      for (const comment of post.comments) {
        const commenterId =
          typeof comment.commentedBy === "object"
            ? comment.commentedBy._id?.toString()
            : comment.commentedBy?.toString();

        if (commenterId === userId) {
          allUserComments.push({
            _id: comment._id,
            text: comment.text,
            commentedAt: comment.commentedAt,
            likes: comment.likes || [],
            commentedBy: comment.commentedBy,
            post: {
              _id: post._id,
              postType: post.postType,
              title: post.title,
              description: post.description,
              imgPath: post.imgPath,
              createdAt: post.createdAt,
              postByUser: post.postByUser,
              likesCount: post.likes ? post.likes.length : 0,
              commentsCount: post.comments ? post.comments.length : 0,
            },
          });
        }
      }
    }

    // Sort by comment date (newest first)
    allUserComments.sort(
      (a, b) => new Date(b.commentedAt) - new Date(a.commentedAt)
    );

    // Paginate
    const totalComments = allUserComments.length;
    const totalPages = Math.ceil(totalComments / limit);
    const paginatedComments = allUserComments.slice(skip, skip + limit);

    return res.status(200).json({
      success: true,
      comments: paginatedComments,
      pagination: {
        currentPage: page,
        totalPages,
        totalComments,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching user comments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching user comments",
    });
  }
};
