const express = require("express");
const router = express.Router();
const { createPost, getAllPosts, getCommunityPost, deletePost } = require("../controllers/Post");

const { auth } = require("../middlewares/auth");

router.post("/createpost", auth, createPost);
router.get("/getallpost", auth, getAllPosts);
router.get("/getcommunitypost", auth, getCommunityPost);
router.post('/deletepost', auth, deletePost);

module.exports = router;
