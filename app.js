// Updated server/app.js with environment-based PORT and Socket.IO CORS cleanup
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("./config/passport");
const socketIO = require("socket.io");

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 4000;

// DB, Cloudinary, and Routes
const database = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");
const userRoutes = require("./routes/User");
const postRoutes = require("./routes/Post");
const likeRoutes = require("./routes/Like");
const commentRoutes = require("./routes/Comment");
const chatRoutes = require("./routes/Chat");
const messageRoutes = require("./routes/Message");
const profileRoutes = require("./routes/Profile");
const serviceRoutes = require("./routes/Services");
const accessToken = require("./routes/Get_AccessToken");
const pageRoutes = require("./routes/Page");
const advRoutes = require("./routes/advPostRoutes");
const notificationRoutes = require("./routes/Notification");

// Connect DB
database.connect();

// CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "https://nityam-frontend-lemon.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
  })
);
app.use(session({
  secret: "asdfghjklkjhgfdfghj",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },
}));
app.use(passport.initialize());
app.use(passport.session());
cloudinaryConnect();

// Mount routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/post", postRoutes);
app.use("/api/v1/like", likeRoutes);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/message", messageRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/page", pageRoutes);
app.use("/api/v1/token", accessToken);
app.use("/api/v1/advpost", advRoutes);
app.use("/api/v1/notifications", notificationRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Socket.IO setup
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

global.io = io;

// Socket.IO Events
io.on("connection", (socket) => {
  console.log("Socket.IO connected");

  socket.on("setup", (userData) => {
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room:", room);
  });

  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessage) => {
    const chat = newMessage.chat;
    if (!chat?.users) return;
    chat.users.forEach((user) => {
      if (user._id !== newMessage.sender._id) {
        socket.in(user._id).emit("message received", newMessage);
        socket.in(user._id).emit("chat updated", {
          chatId: chat._id,
          latestMessage: newMessage
        });
      }
    });
  });

  socket.on("message seen", async ({ messageId }) => {
    const Message = require("./models/Message");
    const updated = await Message.findByIdAndUpdate(
      messageId,
      { status: "seen" },
      { new: true }
    );
    socket.broadcast.emit("message status updated", updated);
  });

  socket.on("message deleted", ({ messageId }) => {
    socket.broadcast.emit("message removed", { messageId });
  });

  socket.on("message edited", ({ message }) => {
    socket.broadcast.emit("message updated", message);
  });

  socket.on("disconnect", () => {
    console.log("Socket.IO disconnected");
  });
});
