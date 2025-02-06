const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
  repliedBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  text: {
    type: String,
  },
  repliedAt: {
    type: Date,
    default: new Date(),
    required: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  replies: [this], 
});

// Comment Schema
const commentSchema = new mongoose.Schema({
  commentedBy: {
    type: mongoose.Types.ObjectId,
    ref: "User",
  },
  text: {
    type: String,
  },
  commentedAt: {
    type: Date,
    default: new Date(),
    required: true,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  replies: [replySchema], 
});

// Advertised Post Schema
const advertisedPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    imagesArray: {
      type: [String], 
    },
    // timeSlot: {
    //     start: { type: Date, required: true },
    //     end: { type: Date, required: true },
    // },
    ageGroup: {
        minAge: { type: Number, required: true },
        maxAge: { type: Number, required: true },
    },
    pageId:{
      type:mongoose.Schema.Types.ObjectId,ref:"Page"
    },

    dateSlot: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
    },
    communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
    buttonLabel: {
        type: {
          type: String,
          enum: [
            "Contact Us",
            "Send Enquiry",
            "Apply Now",
            "Visit Our Website",
            "Message Us",
            "Download App",
            "Subscribe Us",
            "Fill Form"
          ],
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
      },
      
    like: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema], 
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdvertisedPost", advertisedPostSchema);
