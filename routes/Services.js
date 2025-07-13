const express = require("express");
const router = express.Router();
const {auth} = require("../middlewares/auth");
const { createService,getServices,getServicesByUserId} = require("../controllers/Services");

router.get('/getservices', auth, getServices);
router.post('/createservice', auth, createService);
router.get('/user-services/:userId', auth, getServicesByUserId);


module.exports = router;
