const express = require("express");
const router = express.Router();
const {
  getPublicPost,
  getShareMetadata,
  trackShare,
  trackClick,
  getPostAnalytics,
} = require("../controllers/Share");
const { auth } = require("../middlewares/auth");

// Public routes (no authentication required)
router.get("/post/:postId", getPublicPost);
router.get("/post/:postId/metadata", getShareMetadata);
router.post("/click", trackClick);

// Protected routes (authentication required)
router.post("/track", auth, trackShare);
router.get("/analytics/:postId", auth, getPostAnalytics);

module.exports = router;
