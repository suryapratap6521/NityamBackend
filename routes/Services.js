const express = require("express");
const router = express.Router();
const {auth} = require("../middlewares/auth");
const { createService,getServices} = require("../controllers/Services");

router.get('/getservices', auth, getServices);
router.post('/createservice', auth, createService);

module.exports = router;
