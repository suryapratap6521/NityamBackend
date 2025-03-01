const express = require("express");
const router = express.Router();
const { createPost, getAllPosts, getCommunityPost, deletePost,createAdv,voteOnPoll,getVoters,getCommunityEvents} = require("../controllers/Post");

const { auth } = require("../middlewares/auth");

router.post("/createpost", auth, createPost);
router.get("/getallpost", auth, getAllPosts);
router.get("/getcommunitypost", auth, getCommunityPost);
router.post('/deletepost', auth, deletePost);
router.post('/createadv',auth,createAdv);
router.get('/:postId/voters/:optionIndex', auth,getVoters);

router.post('/:postId/vote', auth, voteOnPoll);
router.get("/events", auth, getCommunityEvents);
module.exports = router;
