const express = require("express");
const router = express.Router();
const { likePost } = require("../controllers/Like");
const { auth } = require("../middlewares/auth");

router.post("/setlike-unlike", auth ,likePost);

module.exports = router;
