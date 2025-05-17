// /socket/connection.js
const Message = require("../models/Message");

// Tracks currently online users: Map<userId, socketId>
const onlineUsers = new Map();

function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // User setup and mark as online
    socket.on("setup", (userData) => {
      if (!userData?._id) return;
      socket.join(userData._id);
      onlineUsers.set(userData._id, socket.id);
      socket.broadcast.emit("user online", userData._id);
      socket.emit("connected");
    });

    // Join a specific chat room
    socket.on("join chat", (roomId) => {
      socket.join(roomId);
      console.log(`User joined room: ${roomId}`);
    });

    // Typing indicators
    socket.on("typing", (roomId) => socket.in(roomId).emit("typing"));
    socket.on("stop typing", (roomId) => socket.in(roomId).emit("stop typing"));

    // Handle new message
    socket.on("new message", (newMessage) => {
      const chat = newMessage?.chat;
      if (!chat?.users) return;

      chat.users.forEach((user) => {
        if (user._id === newMessage.sender._id) return;
        const socketId = onlineUsers.get(user._id);
        if (socketId) {
          io.to(socketId).emit("message received", newMessage);
          io.to(socketId).emit("chat updated", {
            chatId: chat._id,
            latestMessage: newMessage,
          });
        }
      });
    });

    // Message seen
    socket.on("message seen", async ({ messageId, userId }) => {
      try {
        const updated = await Message.findByIdAndUpdate(
          messageId,
          {
            status: "seen",
            $addToSet: { readBy: userId },
          },
          { new: true }
        );
        socket.broadcast.emit("message status updated", updated);
      } catch (error) {
        console.error("❌ Error updating message seen:", error);
      }
    });

    // Message edit/delete
    socket.on("message edited", ({ message }) => {
      socket.broadcast.emit("message updated", message);
    });

    socket.on("message deleted", ({ messageId }) => {
      socket.broadcast.emit("message removed", { messageId });
    });

    // On disconnect
    socket.on("disconnecting", () => {
      const userEntry = [...onlineUsers.entries()].find(
        ([, sid]) => sid === socket.id
      );
      if (userEntry) {
        const [userId] = userEntry;
        onlineUsers.delete(userId);
        socket.broadcast.emit("user offline", userId);
        console.log("❌ User offline:", userId);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected:", socket.id);
    });
  });
}

module.exports = { setupSocket, onlineUsers };
