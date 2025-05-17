const express = require("express");
const router = express.Router();

const {allMessages,sendMessage,unreadCount,markDelivered,markSeen,addReaction,removeReaction,editMessage,deleteMessage,searchMessages} =require("../controllers/Message")

const { auth } = require("../middlewares/auth");

router.get("/:chatId", auth, allMessages);
router.post("/", auth, sendMessage);

router.get("/unreadCount/:chatId", auth, unreadCount);
router.put("/reacts", auth, addReaction);
router.put("/unreact", auth, removeReaction);
router.put("/edit/:messageId", auth, editMessage);
router.delete("/:messageId", auth, deleteMessage);
router.get("/search/:chatId", auth, searchMessages);

// // ✅ New optimized endpoints
router.put("/deliver/:messageId", auth, markDelivered);
router.put("/seen/:messageId", auth, markSeen);

module.exports = router;
