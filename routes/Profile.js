const express = require("express");
const router=express.Router();
const {auth}=require("../middlewares/auth");
const {updateDisplayPicture,updateProfile,deleteAccount,getAllUserDetails,lastSeen,getProfile}=require("../controllers/Profile");

//====================================================
//this is for changing the profile
router.get("/getProfile",auth,getProfile);
router.delete("/deleteProfile",auth,deleteAccount);
router.put("/updateProfile", auth, updateProfile);
router.put("/updateDisplayPicture", auth, updateDisplayPicture)
router.get("/getuserdetail",auth,getAllUserDetails);
router.get("/status/:id",auth,lastSeen);

module.exports=router;