const express = require("express");
const { createPage } = require("../controllers/Page");
const {auth}=require("../middlewares/auth");
const router = express.Router();

router.post("/createpage",auth, createPage);

module.exports = router;
