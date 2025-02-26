const AdvertisedPost = require("../models/AdvertisedPost");
const Community = require("../models/Community");
const Page = require("../models/Page");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
}); 


// Create Advertised Post
exports.createAdvertisedPost = async (req, res) => {
  try {
    const parseNestedFields = (body) => {
      return {
        title: body.title,
        pageId: body.pageId,
        price: Number(body.price),
        ageGroup: {
          minAge: Number(body["ageGroup[minAge]"]),
          maxAge: Number(body["ageGroup[maxAge]"]),
        },
        dateSlot: {
          startDate: new Date(body["dateSlot[startDate]"]),
          endDate: new Date(body["dateSlot[endDate]"]),
        },
        optionType: body.optionType,
        states: body.states ? JSON.parse(body.states) : [],
        cities: body.cities ? JSON.parse(body.cities) : [],
        communities: Array.isArray(body.communities) ? body.communities : [body.communities],
        buttonLabel: {
          type: body["buttonLabel[type]"],
          value: body["buttonLabel[value]"],
        },
      };
    };

    const parsedBody = parseNestedFields(req.body);
    console.log('Parsed Body:', parsedBody); // Debug log

    // Validate ageGroup
    if (!parsedBody.ageGroup || parsedBody.ageGroup.minAge == null || parsedBody.ageGroup.maxAge == null) {
      return res.status(400).json({ message: "Invalid ageGroup. Both minAge and maxAge are required." });
    }

    if (parsedBody.ageGroup.minAge < 5 || parsedBody.ageGroup.maxAge > 90 || parsedBody.ageGroup.minAge >= parsedBody.ageGroup.maxAge) {
      return res.status(400).json({ message: "Invalid ageGroup. Ensure valid age range." });
    }

    // Validate dateSlot
    if (!parsedBody.dateSlot || !parsedBody.dateSlot.startDate || !parsedBody.dateSlot.endDate) {
      return res.status(400).json({ message: "Invalid dateSlot. Both startDate and endDate are required." });
    }

    const { startDate, endDate } = parsedBody.dateSlot;
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      return res.status(400).json({ message: "Invalid date format in dateSlot." });
    }

    // Validate buttonLabel
    if (!parsedBody.buttonLabel || !parsedBody.buttonLabel.type || !parsedBody.buttonLabel.value) {
      return res.status(400).json({ message: "Invalid buttonLabel. Both type and value are required." });
    }

    // Validate optionType and fetch communities
    let selectedCommunities = [];

    switch (parsedBody.optionType) {
      case "allUsers":
        selectedCommunities = await Community.find({});
        break;
      case "byState":
        if (!parsedBody.states.length) {
          return res.status(400).json({ message: "States are required for this option." });
        }
        selectedCommunities = await Community.aggregate([
          { $lookup: { from: "users", localField: "userInCommunity", foreignField: "_id", as: "userDetails" } },
          { $match: { "userDetails.state": { $in: parsedBody.states } } },
        ]);
        break;
      case "byCity":
        if (!parsedBody.cities.length) {
          return res.status(400).json({ message: "Cities are required for this option." });
        }
        selectedCommunities = await Community.aggregate([
          { $lookup: { from: "users", localField: "userInCommunity", foreignField: "_id", as: "userDetails" } },
          { $match: { "userDetails.city": { $in: parsedBody.cities } } },
        ]);
        break;
      case "byCommunity":
        if (!parsedBody.communities.length) {
          return res.status(400).json({ message: "Communities are required for this option." });
        }
        selectedCommunities = await Community.find({ communityName: { $in: parsedBody.communities } });
        break;
      default:
        return res.status(400).json({ message: "Invalid option type." });
    }

    console.log('Selected Communities:', selectedCommunities); // Debug log

    if (!selectedCommunities.length) {
      return res.status(404).json({ message: "No communities found for the selected criteria." });
    }

    // Create Razorpay order
    const options = {
      amount: parsedBody.price * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);

    // Create the Advertised Post
    const newPost = new AdvertisedPost({
      title: parsedBody.title,
      pageId: parsedBody.pageId,
      dateSlot: { startDate, endDate },
      ageGroup: parsedBody.ageGroup,
      communities: selectedCommunities.map((c) => c._id), // Store ObjectIds in the communities field
      createdBy: req.user.id,
      buttonLabel: parsedBody.buttonLabel,
    });

    // Handle file uploads
    const files = req.files && req.files.imagesArray
      ? (Array.isArray(req.files.imagesArray) ? req.files.imagesArray : [req.files.imagesArray])
      : [];

    if (files.length > 0) {
      const uploadDetails = await uploadFilesToCloudinary(files, process.env.FOLDER_NAME);
      newPost.imagesArray = uploadDetails.map((file) => file.secure_url);
    }

    await newPost.save();

    // Update page with post ID
    await Page.findByIdAndUpdate(parsedBody.pageId, { $push: { advertisedPosts: newPost._id } });

    const populatedPost = await AdvertisedPost.findById(newPost._id).populate("communities");

    // Update communities with the new post
    await Promise.all(
      selectedCommunities.map(async (community) => {
        await Community.updateOne({ _id: community._id }, { $addToSet: { advertisedPosts: newPost._id } });
      })
    );

    res.status(201).json({
      success: true,
      message: "Advertised post created successfully.",
      post: populatedPost,
      orderId: order.id,
      currency: order.currency,
      amount: order.amount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error creating advertised post.", error });
  }
};


  


  exports.verifyPayment = async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, postData } = req.body;
  
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
  
      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Payment verification failed." });
      }
  
      // Create the advertised post after successful payment
      const newPost = new AdvertisedPost({
        title: postData.title,
        pageId: postData.pageId,
        timeSlot: postData.timeSlot,
        dateSlot: postData.dateSlot,
        ageGroup: postData.ageGroup,
        communities: postData.communities,
        createdBy: req.user.id,
        buttonLabel: postData.buttonLabel,
      });
  
      if (postData.files && postData.files.length > 0) {
        const uploadDetails = await uploadFilesToCloudinary(postData.files, process.env.FOLDER_NAME);
        newPost.imagesArray = uploadDetails.map((file) => file.secure_url);
      }
  
      await newPost.save();
  
      res.status(201).json({
        success: true,
        message: "Payment successful, advertised post created.",
        post: newPost,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error verifying payment.", error: error.message });
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
  