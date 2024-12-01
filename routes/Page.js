const express = require("express");
const { createPage } = require("../controllers/Page");
const router = express.Router();

router.post("/create", createPage);

module.exports = router;

