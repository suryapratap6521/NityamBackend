const express=require("express");
const router=express.Router();
const {auth} = require("../middlewares/auth");
const {accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup, leaveGroup, deleteGroup, resetUnreadCount, updateGroupPhoto}=require("../controllers/Chat");
router.post("/",auth,accessChat);

router.get("/",auth,fetchChats);

router.post("/groupchat",auth,createGroupChat);
router.post("/rename",auth,renameGroup);
router.post("/addtogroup",auth,addToGroup);
router.post("/removefromgroup",auth,removeFromGroup);
router.post("/leavegroup",auth,leaveGroup);
router.post("/deletegroup",auth,deleteGroup);
router.post("/reset-unread", auth, resetUnreadCount);
router.post("/update-group-photo", auth, updateGroupPhoto);
module.exports=router;