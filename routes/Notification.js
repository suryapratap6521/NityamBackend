const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  deleteNotification
} = require('../controllers/Notification');
const { auth } = require('../middlewares/auth');

router.get('/', auth, getNotifications);
router.put('/:id/read', auth, markAsRead);
router.put('/mark-all-read', auth, markAllAsRead);
router.delete('/:id', auth, deleteNotification);

module.exports = router;