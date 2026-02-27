const express = require("express");
const router = express.Router();
const { getUserPosts, getUserComments } = require("../controllers/Activity");
const { auth } = require("../middlewares/auth");

router.get("/posts", auth, getUserPosts);
router.get("/comments", auth, getUserComments);

module.exports = router;
