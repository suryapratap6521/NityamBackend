// app.js
const express = require("express");
const app = express();
const http = require("http"); // Add this line
const server = http.createServer(app); // Update this line

const userRoutes = require("./routes/User");
const postRoutes = require('./routes/Post');
const likeRoutes = require('./routes/Like');
const commentRoutes = require('./routes/Comment');
const chatRoutes = require("./routes/Chat");
const messageRoutes = require("./routes/Message");
const profileRoutes = require("./routes/Profile");
const serviceRoutes = require("./routes/Services");
const pageRoutes=require("./routes/Page");

const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const passport = require('./config/passport');
const session = require('express-session');
const socketIO = require('socket.io'); // Add this line

dotenv.config();
const PORT = process.env.PORT || 4000;

// Connect to the database
database.connect();

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
      origin: ['http://localhost:3000'], // Add your frontend URL here
      methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
      credentials: true, // Allow cookies
    })
  );

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: path.join(__dirname, 'tmp'),
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

// Route Mounting
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/post", postRoutes);
app.use("/api/v1/like", likeRoutes);
app.use("/api/v1/comment", commentRoutes);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/message", messageRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/page",pageRoutes);


// Default Route
app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your Server is Up and Running"
    });
});

// Activate server
server.listen(PORT, () => {
    console.log(`Your app is running at ${PORT}`);
});

// Set up Socket.io
const io = socketIO(server, {
    pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000",
    }
});
global.io = io; // Make `io` globally accessible

// Socket.io connection event
io.on("connection", (socket) => {
    console.log("connected to socket.io");

    socket.on("setup", (userData) => {
        console.log("Setting up socket room for user:", userData._id);
        socket.join(userData._id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User joined room: " + room);
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

    socket.on("new Message", (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id == newMessageRecieved.sender._id) return;
            socket.in(user._id).emit("message recieved", newMessageRecieved);
        });
    });

    socket.off("setup", () => {
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
    });
});
