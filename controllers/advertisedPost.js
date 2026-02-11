
const Community = require("../models/Community");
const Page = require("../models/Page");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { uploadFilesToCloudinary } = require("../utils/imageUploader");
const Transaction = require("../models/Transaction");
const AdvertisedPost= require("../models/AdvertisedPost");
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});



// Parse & normalize nested frontend fields
const parseNestedFields = (body) => ({
  title: body.title,
  description: body.description,
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
  states: typeof body.states === "string" ? JSON.parse(body.states) : body.states || [],
  cities: typeof body.cities === "string" ? JSON.parse(body.cities) : body.cities || [],
  communities: Array.isArray(body.communities) ? body.communities : [body.communities],
  buttonLabel: {
    type: body["buttonLabel[type]"],
    value: body["buttonLabel[value]"],
  },
  premium: body.premium === "true",
});

// ✔️ Razorpay + store payload + image upload
exports.createAdvertisedPost = async (req, res) => {
  try {
    const parsedBody = parseNestedFields(req.body);
    console.log("Parsed Body", parsedBody);

    // Validate inputs
    if (
      !parsedBody.ageGroup.minAge || !parsedBody.ageGroup.maxAge ||
      parsedBody.ageGroup.minAge < 5 || parsedBody.ageGroup.maxAge > 90 ||
      parsedBody.ageGroup.minAge >= parsedBody.ageGroup.maxAge
    ) return res.status(400).json({ message: "Invalid age range." });

    if (
      !parsedBody.dateSlot.startDate || !parsedBody.dateSlot.endDate ||
      parsedBody.dateSlot.startDate >= parsedBody.dateSlot.endDate
    ) return res.status(400).json({ message: "Invalid date slot." });

    if (!parsedBody.buttonLabel?.type || !parsedBody.buttonLabel?.value)
      return res.status(400).json({ message: "Invalid button label." });

    // Community targeting
    let selectedCommunities = [];
    switch (parsedBody.optionType) {
      case "allUsers":
        selectedCommunities = await Community.find({});
        break;
      case "byState":
        if (!parsedBody.states.length) return res.status(400).json({ message: "States required." });
        selectedCommunities = await Community.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userInCommunity",
              foreignField: "_id",
              as: "userDetails"
            }
          },
          {
            $match: {
              "userDetails.state": { $in: parsedBody.states }
            }
          }
        ]);
        break;
      case "byCity":
        if (!parsedBody.cities.length) return res.status(400).json({ message: "Cities required." });
        selectedCommunities = await Community.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userInCommunity",
              foreignField: "_id",
              as: "userDetails"
            }
          },
          {
            $match: {
              "userDetails.city": { $in: parsedBody.cities }
            }
          }
        ]);
        break;
      case "byCommunity":
        if (!parsedBody.communities.length) return res.status(400).json({ message: "Communities required." });
        selectedCommunities = await Community.find({
          communityName: { $in: parsedBody.communities }
        });
        break;
      default:
        return res.status(400).json({ message: "Invalid option type." });
    }

    if (!selectedCommunities.length) {
      return res.status(404).json({ message: "No matching communities found." });
    }
    console.log(req.files,"---->req.files")
    // ✔️ Upload images if provided
    const uploadedImages = req.files?.imagesArray
      ? await uploadFilesToCloudinary(req.files.imagesArray, "ads")
      : [];
    parsedBody.imagesArray = uploadedImages.map(img => img.secure_url);
    console.log("Uploaded Images", parsedBody.imagesArray);

    // ✔️ Create Razorpay Order
    const options = {
      amount: parsedBody.price * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);

    // ✔️ Store transaction & payload
    const transaction = new Transaction({
      amount: parsedBody.price,
      userId: req.user.id,
      orderId: order.id,
      status: "created",
      postPayload: parsedBody,
      communities: selectedCommunities.map(c => c._id),
    });

    await transaction.save();

    return res.status(201).json({
      success: true,
      message: "Payment order created.",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal error", error: err.message });
  }
};
exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature." });
    }

    const transaction = await Transaction.findOne({ orderId: razorpay_order_id });
    if (!transaction) return res.status(404).json({ success: false, message: "Transaction not found." });

    if (transaction.status === "successful") {
      const existingPost = await AdvertisedPost.findOne({ transactionId: razorpay_order_id });
      if (existingPost) return res.status(409).json({ message: "Post already created." });
    }

    transaction.status = "successful";
    await transaction.save();

    const data = transaction.postPayload;

    const newPost = new AdvertisedPost({
      title: data.title,
      description: data.description,
      pageId: data.pageId,
      dateSlot: data.dateSlot,
      ageGroup: data.ageGroup,
      buttonLabel: data.buttonLabel,
      premium: data.premium,
      createdBy: req.user.id,
      transactionId: razorpay_order_id,
      communities: transaction.communities,
      imagesArray: data.imagesArray || [], // ✔️ Add uploaded images
    });

    await newPost.save();

    // Link to Page & Communities
    await Page.findByIdAndUpdate(data.pageId, {
      $push: { advertisedPosts: newPost._id },
    });

    await Promise.all(transaction.communities.map(id =>
      Community.findByIdAndUpdate(id, {
        $addToSet: { advertisedPosts: newPost._id },
      })
    ));

    return res.status(201).json({ success: true, message: "Post created", post: newPost });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Post creation failed", error: error.message });
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

// Get Advertised Posts by Specific User (logged-in user's ads)
exports.getUserAdvertisedPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    const posts = await AdvertisedPost.find({ createdBy: userId })
      .populate("createdBy", "firstName lastName email image")
      .populate("pageId", "businessName businessCategory")
      .populate("communities", "communityName")
      .populate("like", "firstName lastName image")
      .populate("comments.commentedBy", "firstName lastName image")
      .populate("comments.replies.repliedBy", "firstName lastName image")
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: posts.length,
      posts 
    });
  } catch (error) {
    console.error("Error fetching user ads:", error);
    res.status(500).json({ success: false, message: "Error fetching user's advertised posts.", error: error.message });
  }
};

// Like Advertised Post
exports.likeAdvertisedPost = async (req, res) => {
  try {
    const { postId } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    if (post.like.includes(userId)) {
      post.like = post.like.filter(id => id.toString() !== userId);
    } else {
      post.like.push(userId);
    }

    await post.save();

    const populatedPost = await AdvertisedPost.findById(post._id)
      .populate("createdBy")
      .populate("like")
      .populate("pageId")
      .populate("communities")
      .populate("comments.commentedBy")
      .populate("comments.replies.repliedBy");

    res.status(200).json({ success: true, message: "Like status updated.", post: populatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error liking post.", error: error.message });
  }
};


// Add Comment to Advertised Post
exports.addComment = async (req, res) => {
  try {
    const { postId, text } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    post.comments.push({ commentedBy: userId, text });
    await post.save();

    const populatedPost = await AdvertisedPost.findById(post._id)
      .populate("createdBy")
      .populate("pageId")
      .populate("like")
      .populate("communities")
      .populate("comments.commentedBy")
      .populate("comments.replies.repliedBy");

    res.status(201).json({ success: true, message: "Comment added successfully.", post: populatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding comment.", error: error.message });
  }
};


// Reply to a Comment
exports.replyToComment = async (req, res) => {
  try {
    const { postId, commentId, text } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found." });

    comment.replies.push({ repliedBy: userId, text });
    await post.save();

    const populatedPost = await AdvertisedPost.findById(post._id)
      .populate("createdBy")
      .populate("pageId")
      .populate("like")
      .populate("communities")
      .populate("comments.commentedBy")
      .populate("comments.replies.repliedBy");

    res.status(201).json({ success: true, message: "Reply added successfully.", post: populatedPost });
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
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found." });

    let target = comment;

    if (replyId) {
      const reply = comment.replies.id(replyId);
      if (!reply) return res.status(404).json({ success: false, message: "Reply not found." });
      target = reply;
    }

    if (target.likes.includes(userId)) {
      target.likes = target.likes.filter(id => id.toString() !== userId);
    } else {
      target.likes.push(userId);
    }

    await post.save();

    const populatedPost = await AdvertisedPost.findById(post._id)
      .populate("createdBy")
      .populate("pageId")
      .populate("like")
      .populate("communities")
      .populate("comments.commentedBy")
      .populate("comments.replies.repliedBy");

    res.status(200).json({ success: true, message: "Like status updated.", post: populatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating like.", error: error.message });
  }
};


exports.addNestedReply = async (req, res) => {
  try {
    const { postId, commentId, replyId, text } = req.body;
    const userId = req.user.id;

    const post = await AdvertisedPost.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post not found." });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ success: false, message: "Comment not found." });

    const targetReply = comment.replies.id(replyId);
    if (!targetReply) return res.status(404).json({ success: false, message: "Reply not found." });

    targetReply.replies.push({ repliedBy: userId, text });
    await post.save();

    const populatedPost = await AdvertisedPost.findById(post._id)
      .populate("createdBy")
      .populate("pageId")
      .populate("communities")
      .populate("comments.commentedBy")
      .populate("comments.replies.repliedBy");

    res.status(201).json({ success: true, message: "Nested reply added successfully.", post: populatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error adding nested reply.", error: error.message });
  }
};


exports.getCommunities = async (req, res) => {
  try {
    // Fetch only the "name" field from the communities
    const communities = await Community.find({}, 'communityName'); // Second argument specifies the fields to include
    res.status(200).json(communities); // Return only community names
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to fetch community names' });
  }
};
