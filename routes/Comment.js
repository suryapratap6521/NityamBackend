const express = require("express");
const router = express.Router();
const { commentOnPost,replyToComment,likeComment,likeReply,deleteComment,deleteReply} = require("../controllers/Comment");
const { auth } = require("../middlewares/auth");

router.post("/comment", auth, commentOnPost);
router.post("/reply", auth, replyToComment);
router.post("/like-comment", auth, likeComment);
router.post("/like-reply", auth, likeReply);
router.post("/delete-comment", auth, deleteComment);
router.post("/delete-reply", auth, deleteReply);

module.exports = router;
