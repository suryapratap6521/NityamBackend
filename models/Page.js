const mongoose = require("mongoose");
const softDeletePlugin = require('../plugins/softDelete');

const PageSchema = new mongoose.Schema({
   
businessName:{
  type:String,
},
businessCategory:{
  type:String,
},
businessDescription:{
  type:String,
},
businessUrl:{
  type:String,
},
businessPhoneNumber:{
  type:Number,
},
businessEmail:{
  type:String,
},
businessAddress:{
  type:String,
},
businessCity:{
  type:String
},
businessPostCode:{
  type:String,
},
businessProfilePicture:{
  type:String,
},
advertisedPosts:
[
  {
    type:mongoose.Schema.Types.ObjectId,
    ref:"AdvertisedPost"
  }
]
},
  { timestamps: true }
);

// ✅ Apply soft delete plugin
PageSchema.plugin(softDeletePlugin);

const Page = mongoose.model("Page", PageSchema);

module.exports = Page;
