const express = require("express");
const router = express.Router();
const { createComment, deleteComment,addReply,likeComment,likeReply,addNestedReply } = require("../controllers/Comment");
const { auth } = require("../middlewares/auth");

router.post("/createcomment", auth, createComment);
router.post("/deletecomment", auth, deleteComment);
router.post('/reply', auth, addReply);
router.post('/like-comment', auth, likeComment);
router.post('/like-reply', auth, likeReply);
router.post('/nestedreply',auth,addNestedReply);

module.exports = router;
