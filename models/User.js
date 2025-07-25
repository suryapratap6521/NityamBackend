const mongoose = require('mongoose');
const { isEmail } = require('validator');

const userSchema = new mongoose.Schema({

  firstName: {
    type: String,
    // required: true,
    trim: true,
  },
  lastName:{
    type: String,
    // required: true,
    trim: true,
  },
  email: {
    type: String,
    // required: true,
    trim: true,
    validate: [isEmail, "Must be valid email address"],
  },
  password: {
    type: String,

  },
  profession:{
    type:String,
  },
  hourlyCharge:{
    type:Number,
  },
  services:[
    {
    type:mongoose.Schema.Types.ObjectId,
    ref:"Services",
    }
  ],
  accountType: {
    type: String,
    enum: ["People","Business"],
    // required: true,
  },
  additionalDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Profile",
  },
  token: {
    type: String,
  },
  
  lastSeen: {
  type: Date,
  default: Date.now,
},
isOnline: {
  type: Boolean,
  default: false,
},

  image: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    sparse: true, // Ensures unique index only for non-null values
  },
  resetPasswordExpires: {
    type: Date,
  },
  documentUrl: {
    type: String,
    default: ""
  },
  Address:{
    type:String,
    default:"",
  },
  verificationByPostalCard: {
    type: String,
    default: "false"
  },
  phoneNumber: {
    type: String,

  },
  state: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    // required: true,
    trim: true
  },
  community: {
    type: String,
    // required: true,
    trim: true,
  },
  communityDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
  },
  postalCost: {
    type: Number,
    // required: true,
    trim: true
  },
  postByUser: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    }
  ],
  pages:
  [
  {
    type:mongoose.Schema.Types.ObjectId,
    ref:"Page"
  },
 ],
});

const User = mongoose.model('User', userSchema);
module.exports = User;
