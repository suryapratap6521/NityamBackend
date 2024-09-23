const express = require("express");
const router=express.Router();
const {auth}=require("../middlewares/auth");
const {updateDisplayPicture,updateProfile,deleteAccount,}=require("../controllers/Profile");

//====================================================
//this is for changing the profile
router.delete("/deleteProfile",auth,deleteAccount);
router.put("/updateProfile", auth, updateProfile);
router.put("/updateDisplayPicture", auth, updateDisplayPicture)

module.exports=router;