

const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

const replySchema = new mongoose.Schema({
  repliedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  text: String,
  repliedAt: { type: Date, default: new Date(), required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [this],
});

const commentSchema = new mongoose.Schema({
  commentedBy: { type: mongoose.Types.ObjectId, ref: "User" },
  text: String,
  commentedAt: { type: Date, default: new Date(), required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  replies: [replySchema],
});

const advertisedPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imagesArray: [String],
  ageGroup: {
    minAge: { type: Number, required: true },
    maxAge: { type: Number, required: true },
  },
  dateSlot: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: "Page" },
  communities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Community' }],
  premium: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buttonLabel: {
    type: {
      type: String,
      enum: ["Contact Us", "Send Enquiry", "Apply Now", "Visit Our Website", "Message Us", "Download App", "Subscribe Us", "Fill Form"],
      required: true,
    },
    value: { type: String, required: true },
  },
  like: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  transactionId: { type: String },
}, { timestamps: true });

// ✅ Apply soft delete plugin
advertisedPostSchema.plugin(softDeletePlugin);

module.exports = mongoose.model("AdvertisedPost", advertisedPostSchema);
