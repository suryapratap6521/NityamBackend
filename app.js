  // ✅ app.js (Backend Server with Real-time Message & Status Handling)
  const express = require("express");
  const app = express();
  const http = require("http");
  const server = http.createServer(app);
  const socketIO = require("socket.io");
  const cors = require("cors");
  const path = require("path");
  const dotenv = require("dotenv");
  const fileUpload = require("express-fileupload");
  const cookieParser = require("cookie-parser");
  const session = require("express-session");
  const passport = require("./config/passport");


  const { cloudinaryConnect } = require("./config/cloudinary");
  const database = require("./config/database");
  const Message = require("./models/Message");
  const Chat = require("./models/Chat");
  const User = require("./models/User");

  // 🌐 Load env
  dotenv.config();
  const PORT = process.env.PORT || 8080;

  // 🛠 DB Connect
  database.connect();

const allowedOrigins = [
  "http://localhost:3000",
  "https://nityam-frontend-lemon.vercel.app"
];

app.set('trust proxy', 1);


app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Google redirect)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, origin); // Must echo exact origin string
    }

    console.error("❌ CORS error: Origin not allowed ->", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // Required for sending cookies
}));



  app.use(express.json());
  app.use(cookieParser());
  app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
  }));
  app.use(session({
    secret: "asdfghjklkjhgfdfghj",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  cloudinaryConnect();

  // 🛣️ Routes
  app.use("/api/v1/auth", require("./routes/User"));
  app.use("/api/v1/post", require("./routes/Post"));
  app.use("/api/v1/like", require("./routes/Like"));
  app.use("/api/v1/comment", require("./routes/Comment"));
  app.use("/api/v1/chat", require("./routes/Chat"));
  app.use("/api/v1/message", require("./routes/Message"));
  app.use("/api/v1/profile", require("./routes/Profile"));
  app.use("/api/v1/services", require("./routes/Services"));
  app.use("/api/v1/page", require("./routes/Page"));
  app.use("/api/v1/token", require("./routes/Get_AccessToken"));
  app.use("/api/v1/advpost", require("./routes/advPostRoutes"));
  app.use("/api/v1/notifications", require("./routes/Notification"));
  app.use("/api/v1/contact", require("./routes/contactRoutes"));

  app.get("/", (_, res) => res.json({ success: true, message: "Server running" }));

  server.listen(PORT, () => {
    console.log(`✅ Your app is running at ${PORT}`);
  });
 

  // 🔌 Socket.IO Setup
  const io = socketIO(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
 global.io = io; // ✅ Make Socket.IO accessible globally
  const userSocketMap = {};



  io.on("connection", (socket) => {
    console.log("✅ Socket connected");

    socket.on("setup", async (userData) => {
      console.log("user",userData);
      console.log("🟢 User connected:", userData._id);
      console.log("Socket ID:", socket.id);
      if (!userData || !userData._id) {
        console.error("⚠️ Invalid user data received in setup");
        return socket.emit("error", "Invalid user data");
      }
      socket.join(userData._id);
      userSocketMap[socket.id] = userData._id;
      await User.findByIdAndUpdate(userData._id, { isOnline: true, lastSeen: new Date() });
      io.emit("online-status-changed", { userId: userData._id, isOnline: true, lastSeen: new Date() });
      socket.emit("connected");
    });

    socket.on("join chat", (room) => socket.join(room));

    socket.on("typing", (room) => socket.to(room).emit("typing"));
    socket.on("stop typing", (room) => socket.to(room).emit("stop typing"));

    socket.on("message delivered", async ({ messageId, userId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && !msg.deliveredTo.includes(userId)) {
          msg.deliveredTo.push(userId);
          if (msg.status !== "seen") msg.status = "delivered";
          await msg.save();
        }
      } catch (e) {
        console.error("delivery error:", e);
      }
    });

    socket.on("message seen", async ({ messageId, userId }) => {
      try {
        const msg = await Message.findById(messageId).populate("chat");
        if (!msg || msg.seenBy.includes(userId)) return;
        msg.seenBy.push(userId);
        msg.status = "seen";
        await msg.save();
        io.in(msg.chat._id.toString()).emit("message seen updated", { messageId, userId });
      } catch (e) {
        console.error("seen error:", e);
      }
    });

    socket.on("new Message", (msg) => {
      const chat = msg.chat;
      if (!chat?.users) return;
      chat.users.forEach((u) => {
        if (u._id === msg.sender._id) return;
        socket.in(u._id).emit("message recieved", msg);
      });
    });

  socket.on("disconnect", async () => {
  try {
    const userId = socket.userId || userSocketMap[socket.id]; // ✅ Fallback check
    delete userSocketMap[socket.id]; // ✅ Clean up mapping

    console.log("🔴 Socket disconnected:", socket.id);
    console.log("🧾 User ID:", userId);

    if (userId) {
      // Update user status in DB
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
      });

      // Notify others of user's offline status
      io.emit("online-status-changed", {
        userId,
        isOnline: false,
        lastSeen,
      });

      console.log("🟡 User marked offline in DB:", userId);
    } else {
      console.warn("⚠️ No userId found for this disconnected socket.");
    }
  } catch (error) {
    console.error("❌ Error during disconnect handling:", error.message);
  }
});

  });
