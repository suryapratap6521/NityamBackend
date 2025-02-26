const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead 
} = require('../controllers/Notification');
const { auth } = require('../middlewares/auth');

router.get('/notifications', auth, getNotifications);
router.put('/notifications/:id/read', auth, markAsRead);
router.put('/notifications/mark-all-read', auth, markAllAsRead);

module.exports = router;