const express = require("express");
const { createPage } = require("../controllers/Page");
const router = express.Router();

router.post("/createpage", createPage);

module.exports = router;
