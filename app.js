const express = require("express");
const app = express();


const userRoutes = require("./routes/User");
const postRoutes =require('./routes/Post');
const likeRoutes=require('./routes/Like');
const commentRoutes=require('./routes/Comment');
const chatRoutes=require("./routes/Chat");
const messageRoutes=require("./routes/Message");
const profileRoutes=require("./routes/Profile");
const serviceRoutes=require("./routes/Services");
const database = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const dotenv = require("dotenv");
const passport = require('./config/passport');
const session = require('express-session');

dotenv.config();
const PORT = process.env.PORT || 4000;

//database connect
database.connect();

//middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);

app.use(
    fileUpload({
        useTempFiles: true,
        tempFileDir: "/temp",
    })
);

app.use(session({
    secret: "asdfghjklkjhgfdfghj", // You should use a strong, randomly generated secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
  }));


// Initialize Passport and restore authentication state, if any, from the session
app.use(passport.initialize());
app.use(passport.session());

//Cloudinary Connection
cloudinaryConnect();

// Routes Mounting
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/post",postRoutes)
app.use("/api/v1/like",likeRoutes);
app.use('/api/v1/comment',commentRoutes);
app.use('/api/v1/chat',chatRoutes);
app.use('/api/v1/message',messageRoutes);
app.use('/api/v1/profile',profileRoutes);
app.use('/api/v1/services',serviceRoutes);

//default route
app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your Server is Up and Running"
    });
});

//activate server
const server = app.listen(PORT, () => {
    console.log(`Your app is running at ${PORT}`);
});
const io=require('socket.io')(server,{
    pingTimeout:60000,
    cors:{
        origin:"http://localhost:3000",
    }
});
io.on("connection",(socket)=>{
    console.log("connected to socket.io")

    socket.on("setup",(userData)=>{
    socket.join(userData._id);
    socket.emit("connected");
})
socket.on("join chat",(room)=>{
    socket.join(room);
    console.log("User joined room: "+room)
})
socket.on("typing", (room) => socket.in(room).emit("typing"));
socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

socket.on("new Message",(newMessageRecieved)=>{
    var chat=newMessageRecieved.chat;

    if(!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user)=>{
        if(user._id==newMessageRecieved.sender._id) return;
        socket.in(user._id).emit("message recieved",newMessageRecieved);
    })
})
socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });

})