const express = require("express");
const { createPage,deletePage,updatePage,viewPage } = require("../controllers/Page");
const {auth}=require("../middlewares/auth");
const router = express.Router();

router.post("/createpage",auth, createPage);
router.put("/updatepage",auth,updatePage);
router.delete("/deletepage",auth,deletePage);
router.get("/page",auth,viewPage);


module.exports = router;
