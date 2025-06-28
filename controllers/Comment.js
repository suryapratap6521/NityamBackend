const Post =require("../models/Post");
exports.commentOnPost = async (req, res) => {
  try {
    const { postId, text } = req.body;
    const userId = req.user.id;

    const comment = {
      commentedBy: userId,
      text,
    };

    const post = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: comment } },
      { new: true }
    ).populate({
      path: "comments.commentedBy",
      select: "firstName lastName email city state communityDetails image",
      populate: { path: "communityDetails", select: "communityName" },
    });
    console.log("--postcomment",post.comments);

    global.io.emit("comment added", { postId, comments: post.comments });

    res.status(200).json({ success: true, message: "Comment added", comments: post.comments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error in commentOnPost" });
  }
};

// --------------------
// Like / Unlike Comment
// --------------------
exports.likeComment = async (req, res) => {
  try {
    const { postId, commentId } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    const index = comment.likes.indexOf(userId);

    if (index === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(index, 1); // Toggle like
    }

    await post.save();

    // ✅ Full population including all reply levels
    const updatedPost = await Post.findById(postId).populate({
      path: "comments.commentedBy comments.replies.repliedBy comments.replies.replies.repliedBy",
      select: "firstName lastName image"
    });

    const updatedComments = updatedPost.comments;

    // ✅ Emit socket event for live update
    global.io.emit("comment liked", { postId, comments: updatedComments });

    return res.status(200).json({
      success: true,
      message: "Comment like toggled",
      comments: updatedComments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};




// --------------------
// Add Reply (Nested)
// --------------------
  exports.replyToComment = async (req, res) => {
    try {
      const { postId, commentId, replyId, text } = req.body;
      console.log(postId,commentId,replyId,text);
      const userId = req.user.id;

      const post = await Post.findById(postId).populate({
        path: "comments.commentedBy comments.replies.repliedBy comments.replies.replies.repliedBy",
        select: "firstName lastName image",
      });

      const comment = post.comments.id(commentId);
      if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

      let target = comment;
      if (replyId) {
        const findReply = (replies) => {
          for (let r of replies) {
            if (r._id.toString() === replyId) return r;
            const nested = findReply(r.replies);
            if (nested) return nested;
          }
          return null;
        };
        target = findReply(comment.replies);
        if (!target) return res.status(404).json({ success: false, message: "Reply not found" });
      }

      target.replies.push({ repliedBy: userId, text });
      await post.save();

      const updatedPost = await Post.findById(postId)
        .populate({
          path: "comments.commentedBy comments.replies.repliedBy comments.replies.replies.repliedBy",
          select: "firstName lastName image",
        });

      global.io.emit("comment updated", {
        postId,
        comments: updatedPost.comments,
      });

      res.status(200).json({
        success: true,
        message: "Reply added",
        comments: updatedPost.comments,
      });
    } catch (err) {
      console.error("Error in replyToComment:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };


// --------------------
// Like / Unlike Reply (Recursive)
// --------------------
exports.likeReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    // Recursive reply finder
    const findReply = (replies) => {
      for (let r of replies) {
        if (r._id.toString() === replyId) return r;
        const nested = findReply(r.replies);
        if (nested) return nested;
      }
      return null;
    };

    const reply = findReply(comment.replies);
    if (!reply) return res.status(404).json({ success: false, message: "Reply not found" });

    const index = reply.likes.indexOf(userId);
    if (index === -1) reply.likes.push(userId);
    else reply.likes.splice(index, 1); // Toggle

    await post.save();

    // 🔁 Refetch with full population like likeComment
    const updatedPost = await Post.findById(postId).populate({
      path: "comments.commentedBy comments.replies.repliedBy comments.replies.replies.repliedBy",
      select: "firstName lastName image",
    });

    const updatedComments = updatedPost.comments;

    // ✅ Emit socket update
    global.io.emit("comment updated", { postId, comments: updatedComments });

    return res.status(200).json({
      success: true,
      message: "Reply like toggled",
      comments: updatedComments,
    });

  } catch (err) {
    console.error("Error in likeReply:", err);
    res.status(500).json({ success: false, message: "Server error in likeReply" });
  }
};


exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    if (comment.commentedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this comment" });
    }

    comment.remove();
    await post.save();

    global.io.emit("comment deleted", { postId, commentId });

    res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error in deleteComment" });
  }
};


exports.deleteReply = async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found" });

    const deleteRecursive = (replies, replyId) => {
      for (let i = 0; i < replies.length; i++) {
        const reply = replies[i];
        if (reply._id.toString() === replyId) {
          if (reply.repliedBy.toString() !== userId.toString()) {
            return { error: "Unauthorized" };
          }
          replies.splice(i, 1);
          return { deleted: true };
        }
        const result = deleteRecursive(reply.replies, replyId);
        if (result?.deleted || result?.error) return result;
      }
      return null;
    };

    const result = deleteRecursive(comment.replies, replyId);
    if (!result) return res.status(404).json({ success: false, message: "Reply not found" });
    if (result.error) return res.status(403).json({ success: false, message: result.error });

    await post.save();

    global.io.emit("reply deleted", { postId, commentId, replyId });

    res.status(200).json({ success: true, message: "Reply deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error in deleteReply" });
  }
};
