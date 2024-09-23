const express= require("express");
const router=express.Router();
const {allMessages,sendMessage}=require("../controllers/Message");
const {auth}=require("../middlewares/auth");


router.get("/:chatId",auth,allMessages);
router.post("/",auth,sendMessage);

module.exports=router;