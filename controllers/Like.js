
const Post = require("../models/Post");
const Community=require('../models/Community');
const User=require('../models/User');
exports.setLike = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }


    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $addToSet: {
          like: userId,
          likes: userId
      },
      $set: { checkLike: true }
  }, { new: true })


 

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

  res.json(communityPost);

    
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in setting the like",
    });
  }
};

exports.setUnlike = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    if (!postId) {
      return res.status(400).json({
        success: false,
        message: "Post ID is required",
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { 
        $pull: { likes: userId,like:userId}, // Remove userId from likes array
        $set: { checkLike: false } // Update checkLike field
      },
      { new: true }
    )

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

    res.json(communityPost);
  
    
  
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error in setting the unlike",
    });
  }
};
