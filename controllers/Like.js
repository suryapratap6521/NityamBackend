const Post = require("../models/Post");

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
    if (index === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();

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
