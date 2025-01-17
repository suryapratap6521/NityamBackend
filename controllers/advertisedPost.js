const AdvertisedPost = require("../models/AdvertisedPost");
const Community = require("../models/Community");
const Page = require("../models/Page");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");

// Create Advertised Post
exports.createAdvertisedPost = async (req, res) => {
    try {
      const {
        title,
        timeSlot,
        ageGroup,
        dateSlot,
        optionType,
        states,
        cities,
        communities,
        pageId,
        buttonLabel,
      } = req.body;
  
      // Validate timeSlot
      if (!timeSlot || !timeSlot.start || !timeSlot.end) {
        return res.status(400).json({ message: "Invalid timeSlot. Both start and end are required." });
      }
  
      const start = new Date(timeSlot.start);
      const end = new Date(timeSlot.end);
  
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        return res.status(400).json({ message: "Invalid date format in timeSlot." });
      }
  
      // Validate ageGroup
      if (!ageGroup || ageGroup.minAge == null || ageGroup.maxAge == null) {
        return res.status(400).json({ message: "Invalid ageGroup. Both minAge and maxAge are required." });
      }
  
      if (ageGroup.minAge < 5 || ageGroup.maxAge > 90 || ageGroup.minAge >= ageGroup.maxAge) {
        return res.status(400).json({ message: "Invalid ageGroup. Ensure valid age range." });
      }
  
      // Validate dateSlot
      if (!dateSlot || !dateSlot.startDate || !dateSlot.endDate) {
        return res.status(400).json({ message: "Invalid dateSlot. Both startDate and endDate are required." });
      }
  
      const startDate = new Date(dateSlot.startDate);
      const endDate = new Date(dateSlot.endDate);
  
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
        return res.status(400).json({ message: "Invalid date format in dateSlot." });
      }
  
      // Validate buttonLabel
      if (!buttonLabel || !buttonLabel.type || !buttonLabel.value) {
        return res.status(400).json({ message: "Invalid buttonLabel. Both type and value are required." });
      }
  
      // Validate optionType and fetch communities
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
            selectedCommunities = await Community.aggregate([
              {
                $lookup: {
                  from: "users", // The name of the users collection
                  localField: "userInCommunity", // Field in Community schema referencing user IDs
                  foreignField: "_id", // Field in User schema corresponding to the referenced IDs
                  as: "userDetails", // Alias for the joined user details
                },
              },
              {
                $match: {
                  "userDetails.city": { $in: cities }, // Match city in userDetails
                },
              },
            ]);
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
      // Create the Advertised Post
      const newPost = new AdvertisedPost({
        title,
        pageId,
        timeSlot: { start, end },
        dateSlot: { startDate, endDate },
        ageGroup,
        communities: selectedCommunities.map((c) => c._id),
        createdBy: req.user.id,
        buttonLabel,
      });
  
      // Handle file uploads
      const files = req.files ? (Array.isArray(req.files.media) ? req.files.media : [req.files.media]) : [];
      if (files.length > 0) {
        const uploadDetails = await uploadFilesToCloudinary(files, process.env.FOLDER_NAME);
        newPost.imagesArray = uploadDetails.map((file) => file.secure_url);
      }
  
      await newPost.save();
     
      console.log(selectedCommunities);

      //updating the page by pushing the post_id in the array
      await Page.findByIdAndUpdate(pageId, {
        $push: { advertisedPosts: newPost._id }
      });


      const populatedPost = await AdvertisedPost.findById(newPost._id).populate("communities");

      // Update communities with the new post
      await Promise.all(
        selectedCommunities.map(async (community) => {
          try {
            await Community.updateOne(
              { _id: community._id },
              { $addToSet: { advertisedPosts: newPost._id } } // Ensures no duplicates
            );
            console.log(`Advertised post ${newPost._id} added to community ${community._id}`);
          } catch (error) {
            console.error(`Failed to update community ${community._id}:`, error);
          }
        })
      );
      
  
      res.status(201).json({ success: true, message: "Advertised post created successfully.", post: populatedPost });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error creating advertised post.", error: error.message });
    }
  };
  
   

// Get Advertised Posts
exports.getAdvertisedPosts = async (req, res) => {
  try {
    const posts = await AdvertisedPost.find().populate("createdBy").populate("pageId").populate("communities");
    res.status(200).json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching advertised posts.", error: error.message });
  }
};

// Like Advertised Post
exports.likeAdvertisedPost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    if (post.like.includes(userId)) {
      post.like = post.like.filter((id) => id.toString() !== userId);
    } else {
      post.like.push(userId);
    }

    await post.save();
    res.status(200).json({ success: true, message: "Like status updated.", post });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error liking the post.", error: error.message });
  }
};

// Add Comment to Advertised Post
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.body;
    const { text } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    post.comments.push({
      commentedBy: userId,
      text,
    });

    await post.save();
    res.status(201).json({ success: true, message: "Comment added successfully.", post });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding comment.", error: error.message });
  }
};

// Reply to a Comment
exports.replyToComment = async (req, res) => {
  try {
    const { postId, commentId } = req.body;
    const { text } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found." });
    }

    comment.replies.push({
      repliedBy: userId,
      text,
    });

    await post.save();
    res.status(201).json({ success: true, message: "Reply added successfully.", post });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error replying to comment.", error: error.message });
  }
};



// Get communities by states
exports.getCommunitiesByStates = async (req, res) => {
    try {
      const { states } = req.body;
  
      if (!states || !Array.isArray(states) || states.length === 0) {
        return res.status(400).json({ message: "States are required and should be an array." });
      }
  
      // Fetch communities based on states
      const communities = await Community.aggregate([
        {
          $lookup: {
            from: "users", // 'users' is the collection name for User schema
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
  
      if (communities.length === 0) {
        return res.status(404).json({ message: "No communities found for the provided states." });
      }
  
      res.status(200).json({ message: "Communities fetched successfully.", communities });
    } catch (error) {
      console.error("Error fetching communities by states:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  };

  // Get communities by cities
  exports.getCommunitiesByCities = async (req, res) => {
    try {
      const { cities } = req.body;
  
      // Validate input
      if (!cities || !Array.isArray(cities) || cities.length === 0) {
        return res.status(400).json({ message: "Cities are required and should be an array." });
      }
  
      // Perform aggregation to find communities based on users' cities
      const communities = await Community.aggregate([
        {
          $lookup: {
            from: "users", // Name of the users collection
            localField: "userInCommunity", // Field in Community referencing user IDs
            foreignField: "_id", // Field in User corresponding to IDs
            as: "userDetails", // Alias for joined user data
          },
        },
        {
          $match: {
            "userDetails.city": { $in: cities }, // Match cities in userDetails
          },
        },
      ]);
  
      if (communities.length === 0) {
        return res.status(404).json({ message: "No communities found for the provided cities." });
      }
  
      res.status(200).json({
        message: "Communities fetched successfully.",
        communities,
      });
    } catch (error) {
      console.error("Error fetching communities by cities:", error);
      res.status(500).json({ message: "Internal server error.", error: error.message });
    }
  };
  

exports.likeCommentOrReply = async (req, res) => {
    try {
      const { postId, commentId, replyId } = req.body;
      const userId = req.user.id;
  
      const post = await AdvertisedPost.findById(postId);
  
      if (!post) {
        return res.status(404).json({ success: false, message: "Post not found." });
      }
  
      const comment = post.comments.id(commentId);
  
      if (!comment) {
        return res.status(404).json({ success: false, message: "Comment not found." });
      }
  
      let target = comment;
      if (replyId) {
        target = comment.replies.id(replyId);
        if (!target) {
          return res.status(404).json({ success: false, message: "Reply not found." });
        }
      }
  
      if (target.likes.includes(userId)) {
        target.likes = target.likes.filter((id) => id.toString() !== userId);
      } else {
        target.likes.push(userId);
      }
  
      await post.save();
      res.status(200).json({ success: true, message: "Like status updated.", post });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating like.", error: error.message });
    }
  };

  
exports.addNestedReply = async (req, res) => {
    try {
      const { postId, commentId, replyId, text } = req.body;
      const userId = req.user.id;
  
      const post = await AdvertisedPost.findById(postId);
  
      if (!post) {
        return res.status(404).json({ success: false, message: "Post not found." });
      }
  
      const comment = post.comments.id(commentId);
  
      if (!comment) {
        return res.status(404).json({ success: false, message: "Comment not found." });
      }
  
      let target = comment;
      if (replyId) {
        target = comment.replies.id(replyId);
        if (!target) {
          return res.status(404).json({ success: false, message: "Reply not found." });
        }
      }
  
      target.replies.push({
        repliedBy: userId,
        text,
      });
  
      await post.save();
      res.status(201).json({ success: true, message: "Reply added successfully.", post });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error adding reply.", error: error.message });
    }
  };
  
 exports.getCommunities= async (req, res) => {
    try {
      // Fetch only the "name" field from the communities
      const communities = await Community.find({}, 'communityName'); // Second argument specifies the fields to include
      res.status(200).json(communities); // Return only community names
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to fetch community names' });
    }
  };
  