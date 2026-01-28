const express = require("express");
const router = express.Router();
const { createPost, getAllPosts,  getCommunityPost, deletePost,createAdv,voteOnPoll,getVoters,getCommunityEvents,getEventById,updatePost,getPostByIdForPreview,getPostById,bookEvent,restorePost} = require("../controllers/Post");

const { auth } = require("../middlewares/auth");

router.post("/createpost", auth, createPost);
router.get("/getallpost", auth, getAllPosts);
router.get("/getcommunitypost", auth,  getCommunityPost);
router.post('/deletepost', auth, deletePost);
router.post('/restorepost/:id', auth, restorePost); // ✅ Restore deleted post
router.post('/updatepost',auth,updatePost);
router.post('/createadv',auth,createAdv);
router.get('/:postId/voters/:optionIndex', auth,getVoters);
router.post('/:postId/vote', auth, voteOnPoll);
router.get("/events", auth, getCommunityEvents);
router.get('/event/:id',auth,getEventById);
router.post('/event/book', auth, bookEvent);
router.get('/preview/:postId', auth, getPostByIdForPreview);
// 📁 routes/Post.js
router.get("/post/:id", auth, getPostById);

module.exports = router;
