const express= require("express");
const router=express.Router();
const {allMessages,sendMessage,markMessageAsDelivered,markMessageAsSeen}=require("../controllers/Message");
const {auth}=require("../middlewares/auth");


router.get("/:chatId",auth,allMessages);
router.post("/",auth,sendMessage);
router.post("/seen", auth, markMessageAsSeen);
router.post("/delivered", auth, markMessageAsDelivered);
// router.post('/reset-unread',auth,resetUnreadCount);

// router.put("/read/:chatId", auth, markChatAsRead)

module.exports=router;