const express = require("express");
const { createAdvertisedPost,likeAdvertisedPost,replyToComment,addComment,getAdvertisedPosts,getCommunitiesByCities,getCommunitiesByStates,likeCommentOrReply,addNestedReply,getCommunities,verifyPayment} = require("../controllers/advertisedPost");
const {auth}=require("../middlewares/auth");
const router = express.Router();

router.post("/createadvpost",auth, createAdvertisedPost);
router.post("/likeadvpost",auth,likeAdvertisedPost);
router.post("/replyadvpost",auth,replyToComment);
router.post("/addcomment",auth,addComment);
router.post("/getadvertisedpost",auth,getAdvertisedPosts);
router.post("/getcommunitybystate",auth,getCommunitiesByStates);
router.post("/getcommunitybycity",auth,getCommunitiesByCities);
router.post("/likeonreplycomment",auth,likeCommentOrReply);
router.post("/addnestedreply",auth,addNestedReply);
router.get("/getcommunities",auth,getCommunities);
router.post("/verify-payment", auth, verifyPayment);



module.exports = router;
