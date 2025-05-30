const express = require("express");
const router = express.Router();
const { setLike, setUnlike } = require("../controllers/Like");
const { auth } = require("../middlewares/auth");

router.post("/setlike",auth ,setLike);
router.post("/setunlike", auth, setUnlike);

module.exports = router;
