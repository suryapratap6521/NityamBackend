const express = require('express');
const { getAccessToken,getAreas } = require('../controllers/GetLocation');

const router = express.Router();

router.post('/getaccesstoken', getAccessToken);
// router.post('/getAreas', getAreas);
router.post('/getareas',getAreas);

module.exports = router;