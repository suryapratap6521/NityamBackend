const express= require("express");
const router=express.Router();
const {allMessages,sendMessage}=require("../controllers/Message");
const {auth}=require("../middlewares/auth");
const {unreadCount}=require("../controllers/Message");
const {addReaction,removeReaction,editMessage,deleteMessage,searchMessages}=require("../controllers/Message");


router.get("/:chatId",auth,allMessages);
router.post("/",auth,sendMessage);
router.get("/unreadCount/:chatId",auth,unreadCount);
router.put("/react", auth, addReaction);
router.put("/unreact", auth, removeReaction);
router.delete("/:messageId", auth, deleteMessage);
router.put("/edit/:messageId", auth, editMessage);
router.get("/search/:chatId", auth, searchMessages);


module.exports=router;