// app.js
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const path = require("path");
const userRoutes = require("./routes/User");
const postRoutes = require("./routes/Post");
const likeRoutes = require("./routes/Like");
const commentRoutes = require("./routes/Comment");
const chatRoutes = require("./routes/Chat");
const messageRoutes = require("./routes/Message");
const profileRoutes = require("./routes/Profile");
const serviceRoutes = require("./routes/Services");
const accessToken = require('./routes/Get_AccessToken');
const pageRoutes = require("./routes/Page");
const advRoutes = require("./routes/advPostRoutes");
const notificationRoutes = require("./routes/Notification");
const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const passport = require('./config/passport');
const session = require('express-session');
const socketIO = require('socket.io');

dotenv.config();
const PORT = process.env.PORT || 4000;

// Connect to the database
database.connect();

// Define allowed origins based on your environments
const allowedOrigins = [
  "http://localhost:3000",
  "https://nityam-frontend-lemon.vercel.app"
];

// Configure CORS middleware to dynamically allow origins in your list
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Remove manual header settings; they are now handled by cors middleware
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
    cookie: { secure: false } // Set secure: true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Cloudinary Connection
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

// Default Route
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your Server is Up and Running"
  });
});

// Activate server
server.listen(8080, () => {
  console.log(`Your app is running at ${PORT}`);
});

// Set up Socket.IO with proper CORS configuration
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  }
});

global.io = io; // Make `io` globally accessible

// Socket.IO connection events
io.on("connection", (socket) => {
  console.log("Connected to Socket.IO");

  socket.on("setup", (userData) => {
    console.log("Setting up socket room for user:", userData._id);
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("newNotification", (notification) => {
    socket.to(notification.recipient.toString()).emit("notificationReceived", notification);
  });

  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User joined room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new Message", (newMessageRecieved) => {
    const chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("Chat users not defined");

    chat.users.forEach((user) => {
      if (user._id === newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected from Socket.IO");
  });
});
