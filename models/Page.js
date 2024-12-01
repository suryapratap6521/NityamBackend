const mongoose = require("mongoose");

const PageSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    businessType: {
      type: String,
      required: true,
    },
    businessBio: {
      type: String,
      required: true,
    },
    contactInformation: {
      website: {
        type: String,
      },
      phoneNumber: {
        type: String,
        required: true,
      },
      emailAddress: {
        type: String,
        required: true,
      },
    },
    location: {
      address: {
        type: String,
        required: true,
      },
      town: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      postcode: {
        type: String,
        required: true,
      },
    },
    profilePicture: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Page = mongoose.model("Page", PageSchema);

module.exports = Page;
