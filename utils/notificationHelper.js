const Notification = require('../models/Notification');

/**
 * Create and emit notification
 * @param {Object} options - Notification options
 * @param {String} options.recipient - Recipient user ID
 * @param {String} options.sender - Sender user ID
 * @param {String} options.type - Notification type
 * @param {String} options.message - Notification message
 * @param {String} options.post - Post ID (optional)
 * @param {String} options.chat - Chat ID (optional)
 * @param {Object} options.senderData - Populated sender data for socket emission
 */
async function createAndEmitNotification(options) {
  const { recipient, sender, type, message, post, chat, senderData } = options;

  try {
    // Create notification in database
    const notificationData = {
      recipient,
      sender,
      type,
      message,
    };

    if (post) notificationData.post = post;
    if (chat) notificationData.chat = chat;

    const notification = await Notification.create(notificationData);

    // Emit real-time notification via Socket.IO
    if (global.io) {
      const notificationPayload = {
        _id: notification._id,
        sender: senderData || {
          _id: sender,
        },
        type,
        message,
        read: false,
        createdAt: notification.createdAt,
      };

      if (post) notificationPayload.post = post;
      if (chat) notificationPayload.chat = chat;

      global.io.to(recipient.toString()).emit("newNotification", notificationPayload);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create and emit multiple notifications
 * @param {Array} notificationsArray - Array of notification options
 */
async function createAndEmitMultipleNotifications(notificationsArray) {
  try {
    const notifications = await Notification.insertMany(notificationsArray);

    if (global.io && notifications.length > 0) {
      notificationsArray.forEach((notifData, index) => {
        const notification = notifications[index];
        const notificationPayload = {
          _id: notification._id,
          sender: notifData.senderData || { _id: notifData.sender },
          type: notifData.type,
          message: notifData.message,
          read: false,
          createdAt: notification.createdAt,
        };

        if (notifData.post) notificationPayload.post = notifData.post;
        if (notifData.chat) notificationPayload.chat = notifData.chat;

        global.io.to(notifData.recipient.toString()).emit("newNotification", notificationPayload);
      });
    }

    return notifications;
  } catch (error) {
    console.error('Error creating multiple notifications:', error);
    throw error;
  }
}

module.exports = {
  createAndEmitNotification,
  createAndEmitMultipleNotifications,
};
