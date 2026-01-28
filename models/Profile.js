const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

// Define the Profile schema
const profileSchema = new mongoose.Schema({
  gender: {
    type: String,
  },
  dateOfBirth: {
    type: String,
  },
  about: {
    type: String,
    trim: true,
  },
 
});

// ✅ Apply soft delete plugin
profileSchema.plugin(softDeletePlugin);

// Export the Profile model
module.exports = mongoose.model("Profile", profileSchema);