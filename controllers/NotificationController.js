// NotificationController.js
exports.createNotification = async (userId, communityId, postId, message) => {
    try {
      const notification = await Notification.create({
        userId,
        communityId,
        postId,
        message,
        createdAt: new Date(),
      });
      console.log("Notification Created: ", notification);
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };
  