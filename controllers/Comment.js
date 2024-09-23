const Post = require("../models/Post");
const User = require("../models/User");
const Community=require('../models/Community');
exports.createComment = async (req, res) => {
  try {
    const { userId, postId, text } = req.body;

    if (!userId || !postId || !text) {
      return res.status(400).json({
        success: false,
        message: "User ID, Post ID, and text are required",
      });
    }

    const comment = {
      commentedBy: userId,
      text: text,
      commentedAt: new Date(),
      replies: [],
      likes: []
    };

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: comment } },
      { new: true }
    ).populate({
      path: 'comments.commentedBy',
      select: 'firstName lastName email city state communityDetails image',
      populate: { path: 'communityDetails' }
    });

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

    const allPosts = communityDetails.posts;

    res.json(allPosts);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in creating the comment",
    });
  }
};


exports.deleteComment = async (req, res) => {
  try {
    const { postId, commentId } = req.body;

    if (!postId || !commentId) {
      return res.status(400).json({
        success: false,
        message: "Post ID and Comment ID are required",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { comments: { _id: commentId } } },
      { new: true }
    ).populate("comments.commentedBy");

    const userDetails = await User.findById(userId);
  
    // Check if user details exist and if communityDetails is available
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

    const allPosts = communityDetails.posts;

    res.json(allPosts);
  
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in deleting the comment",
    });
  }
};


exports.addReply = async (req, res) => {
  const { postId, commentId, text } = req.body;
  const userId = req.user.id;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    comment.replies.push({
      repliedBy: userId,
      text: text,
    });

    await post.save();

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

    const allPosts = communityDetails.posts;

    
    res.status(200).json({
      success: true,
      message: 'Reply added successfully',
      allPosts
      
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



exports.likeComment = async (req, res) => {
  const { postId, commentId } = req.body;
  const userId = req.user.id;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const index = comment.likes.indexOf(userId);
    if (index === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(index, 1);
    }

    await post.save();
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

    const allPosts = communityDetails.posts;

    
    res.status(200).json({ success: true,
       message: 'Comment liked/unliked successfully',
      allPosts
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.likeReply = async (req, res) => {
  const { postId, commentId, replyId } = req.body;
  const userId = req.user.id;

  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const index = reply.likes.indexOf(userId);
    if (index === -1) {
      reply.likes.push(userId);
    } else {
      reply.likes.splice(index, 1);
    }

    await post.save();
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

    const allPosts = communityDetails.posts;

    
    res.status(200).json({ success: true, message: 'Reply liked/unliked successfully',
      allPosts
     });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
