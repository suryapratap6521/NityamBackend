// Import the required modules
const express = require("express"); 
const router = express.Router();


// Import the required controllers and middleware functions
const {
  login,
  signup,
  sendotp,
  changePassword,
  searchUsers,
  googleLogin,
  googleCallback,
  // googleDetails,
  profileDetails,
  communityAddress,
  community,
  verification,
  profession,
  searchUsersAdvanced,
  getUser,
  refreshToken // ✅ Add refresh token controller
} = require("../controllers/Auth")
const {
  resetPasswordToken,
  resetPassword,
} = require("../controllers/ResetPassword")
const {
  googleAuthMobile,
} = require("../controllers/GoogleAuth")

const { auth } = require("../middlewares/auth")

// Routes for Login, Signup, and Authentication

// ********************************************************************************************************
//                                      Authentication routes
// ********************************************************************************************************

// Route for user login
router.post("/login", login)

// Route for user signup
router.post("/signup", signup)

// Route for sending OTP to the user's email
router.post("/sendotp", sendotp)

// ✅ Route for refreshing access token (no auth required as token is expired)
router.post("/refresh-token", refreshToken)

// Route for Changing the password
router.post("/changepassword", auth, changePassword)

router.put("/profiledetails",auth,profileDetails)

router.put("/communityaddress",auth,communityAddress);

router.put('/community',auth,community);

router.put('/verification',auth,verification);

router.put('/profession',auth,profession);

// ********************************************************************************************************
//                                      Reset Password
// ********************************************************************************************************

// Route for generating a reset password token
router.post("/reset-password-token", resetPasswordToken)

// Route for resetting user's password after verification
router.post("/reset-password", resetPassword)


// route for generating search api
router.get("/search",auth,searchUsers);

// Route for advanced user search with filters
router.get("/searchAdvanced", auth, searchUsersAdvanced);

// Export the router for use in the main application

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback',googleCallback);
router.post('/google/mobile', googleAuthMobile);  // Mobile-friendly Google auth endpoint

router.get('/getuser',auth,getUser)
// router.post('/googledetails',auth,googleDetails);
module.exports = router