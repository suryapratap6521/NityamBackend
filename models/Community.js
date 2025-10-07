const mongoose=require('mongoose');
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

const Community=mongoose.model('Community',communitySchema);
module.exports=Community;