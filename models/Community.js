const mongoose=require('mongoose');
const softDeletePlugin = require('../plugins/softDelete');
const communitySchema=new mongoose.Schema({
communityName:{
    type:String,
    
},
userInCommunity:[
    {
    type:mongoose.Schema.Types.ObjectId,
    ref:"User",
    },
],
posts:[
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:"Post",
    }
],
advertisedPosts:[
    {
        type:mongoose.Schema.Types.ObjectId,
        ref:"AdvertisedPost",
    }
],
})

// ✅ Apply soft delete plugin
communitySchema.plugin(softDeletePlugin);

const Community=mongoose.model('Community',communitySchema);
module.exports=Community;