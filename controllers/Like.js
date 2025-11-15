const Post = require("../models/Post");
const User = require("../models/User");
const Notification = require("../models/Notification");

// --------------------
// Like / Unlike Post
// --------------------
exports.likePost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const index = post.likes.indexOf(userId);
    const isLiking = index === -1;
    
    if (isLiking) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();

    // ✅ Create notification when someone likes a post (but not their own post)
    if (isLiking && post.postByUser.toString() !== userId.toString()) {
      const liker = await User.findById(userId).select("firstName lastName image");
      
      const notification = await Notification.create({
        recipient: post.postByUser,
        sender: userId,
        post: postId,
        type: "like",
        message: `${liker.firstName} ${liker.lastName} liked your post`,
      });

      // ✅ Emit real-time notification to post owner
      global.io.to(post.postByUser.toString()).emit("newNotification", {
        _id: notification._id,
        sender: {
          _id: liker._id,
          firstName: liker.firstName,
          lastName: liker.lastName,
          image: liker.image,
        },
        post: {
          _id: postId,
          title: post.title || post.content?.substring(0, 50),
          postType: post.postType
        },
        type: "like",
        message: notification.message,
        read: false,
        createdAt: notification.createdAt,
      });
    }

    const updatedPost = await Post.findById(postId)
  .populate("postByUser", "firstName lastName email image city community")
  .populate("comments.commentedBy", "firstName lastName image")
  .populate("comments.replies.repliedBy", "firstName lastName image")
  .populate("likes")
  .populate("pollOptions.votes", "firstName lastName email image");


    global.io.emit("post liked", {
      postId,
  updatedPost,
    });

    res.status(200).json({
      success: true,
      updatedPost,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error in likePost" });
  }
};
