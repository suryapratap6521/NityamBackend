// Advanced LinkedIn-style user search
// GET /api/searchUsersAdvanced?search=...&filter=community|city|state|india

const bcrypt = require("bcrypt");
const User = require("../models/User");
const Community=require('../models/Community');
const OTP = require("../models/OTP");
const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
const passport=require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const twilio = require('twilio');
const { uploadFilesToCloudinary } = require("../utils/imageUploader");
const axios = require("axios");

require("dotenv").config();
// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);


const mongoose = require('mongoose');

// Signup controller for registering new users
exports.signup = async (req, res) => {
	try {
		const { firstName, lastName, email, phoneNumber, password, confirmPassword, otp,otpDetailsId } = req.body;
		console.log(firstName, lastName, email, phoneNumber, password, confirmPassword, otp,otpDetailsId,"--------->req.body");

		if (!firstName || !email || !phoneNumber || !password || !confirmPassword || !otp || !otpDetailsId) {
			return res.status(400).json({
				success: false,
				message: "All fields are required.",
			});
		}

		if (password !== confirmPassword) {
			return res.status(400).json({
				success: false,
				message: "Passwords do not match.",
			});
		}

		const existingUserByEmail = await User.findOne({ email });
		if (existingUserByEmail) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this email. Please login.",
			});
		}

		const existingUserByPhone = await User.findOne({ phoneNumber });
		if (existingUserByPhone) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this phone number.",
			});
		}

		// Fetch latest OTP session ID for this phone number


		// Verify OTP using 2Factor
		const verifyRes = await axios.get(
			`https://2factor.in/API/V1/${process.env.API_KEY}/SMS/VERIFY/${otpDetailsId}/${otp}`
		);
		console.log(verifyRes,"--------->verifyRes");

		const { Status, Details } = verifyRes.data;
		if (Status !== "Success") {
			return res.status(400).json({
				success: false,
				message: "Invalid or expired OTP.",
			});
		}

		// Hash password
		const hashedPassword = await bcrypt.hash(password, 10);

		const profile = await Profile.create({
			gender: null,
			dateOfBirth: null,
			about: null,
			phoneNumber: null,
		});

		const user = await User.create({
			firstName,
			lastName,
			email,
			phoneNumber,
			password: hashedPassword,
			accountType: "People",
			additionalDetails: profile._id,
			image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
		});

		const token = jwt.sign(
			{ email: user.email, id: user._id, accountType: user.accountType },
			process.env.JWT_SECRET,
			{ expiresIn: "24h" }
		);

		user.token = token;
		user.password = undefined;

		const options = {
			expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			httpOnly: true,
		};

		res.cookie("token", token, options).status(201).json({
			success: true,
			token,
			user,
			message: "User registered successfully and logged in.",
		});

	} catch (error) {
		console.error("Signup Error:", error.message);
		return res.status(500).json({
			success: false,
			message: "Signup failed. Please try again later.",
		});
	}
};

// Controller to update gender and date of birth in profile after signup
exports.profileDetails = async (req, res) => {
	console.log("dasdasd");
	try {
		const { gender, dateOfBirth } = req.body;
		console.log(req.body,"-----adasdad");
		const userId = req.user.id; // Assuming you have middleware that sets `req.user`

		// Validate input data
		if (!gender || !dateOfBirth) {
			return res.status(400).json({
				success: false,
				message: "Gender and Date of Birth are required.",
			});
		}
		const createdProfile=await Profile.create({
			gender,
			dateOfBirth
		})
		const userDetails = await User.findByIdAndUpdate(
			userId,
			{ additionalDetails: createdProfile._id },
			{ new: true } // This returns the updated document
		  ).populate("communityDetails").populate("additionalDetails");
		  console.log(userDetails);
		  // Check if the user was found and updated
		  if (!userDetails) {
			return res.status(404).json({
			  success: false,
			  message: "User not found.",
			});
		  }

		// Send success response
		return res.status(200).json({
			success: true,
			message: "Profile updated successfully.",
			userDetails,
		});
	} catch (error) {
		console.error("Error updating profile:", error);
		return res.status(500).json({
			success: false,
			message: "Failed to update profile. Please try again later.",
		});
	}
};

exports.communityAddress = async (req, res) => {
	try {
	  const { state, city, pincode } = req.body;
	  const userId = req.user.id; // Assuming middleware sets req.user
  
	  // Validate input data
	  if (!state || !city || !pincode) {
		return res.status(400).json({
		  success: false,
		  message: "State, city, and pincode are required.",
		});
	  }
  
	  // Validate pincode as numeric and of valid length (assuming it's a 6-digit Indian pincode)
	  if (isNaN(pincode) || pincode.toString().length !== 6) {
		return res.status(400).json({
		  success: false,
		  message: "Invalid pincode. Pincode should be a 6-digit number.",
		});
	  }
  
	  // Update user's community address
	  const userDetails = await User.findByIdAndUpdate(
		userId,
		{
		  state: state,
		  city: city,
		  postalCost: pincode,
		},
		{ new: true } // Returns the updated document
	  );
  
	  if (!userDetails) {
		return res.status(404).json({
		  success: false,
		  message: "User not found.",
		});
	  }
  
	  // Send success response
	  return res.status(200).json({
		success: true,
		message: "Community address updated successfully.",
		userDetails, // Return updated user details
	  });
	} catch (error) {
	  console.error("Error updating community address:", error);
	  return res.status(500).json({
		success: false,
		message: "Failed to update community address. Please try again later.",
	  });
	}
  };

exports.searchUsersAdvanced = async (req, res) => {
  const userId = req.user.id;
  const searchTerm = req.query.search || "";
  const filter = req.query.filter || "community";
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  try {
	const user = await User.findById(userId).lean();
	if (!user) return res.status(404).json({ success: false, message: "User not found" });

	let query = { _id: { $ne: userId } };

	if (searchTerm) {
	  const regex = new RegExp(searchTerm, "i");
	  query.$or = [
		{ firstName: regex },
		{ lastName: regex },
		{ profession: regex },
	  ];
	}

	// Filter by region
	if (filter === "community") query.communityDetails = user.communityDetails;
	else if (filter === "city") query.city = user.city;
	else if (filter === "state") query.state = user.state;
	// 'india' = no additional filter

	// Find users
	let allUsers = await User.find(query)
	  .populate("communityDetails", "communityName")
	  .populate("additionalDetails")
	  .populate("services", "name")
	  .select("firstName lastName email image profession services city state communityDetails additionalDetails")
	  .lean();

	// Custom filter on service names
	if (searchTerm) {
	  const lowerSearch = searchTerm.toLowerCase();
	  allUsers = allUsers.filter(user =>
		user.services?.some(svc => svc.name.toLowerCase().includes(lowerSearch)) ||
		user.firstName.toLowerCase().includes(lowerSearch) ||
		user.lastName.toLowerCase().includes(lowerSearch) ||
		user.profession?.toLowerCase().includes(lowerSearch)
	  );
	}

	const totalUsers = allUsers.length;
	const paginatedUsers = allUsers.slice((page - 1) * limit, page * limit);

	res.status(200).json({ success: true, users: paginatedUsers, totalUsers, page, limit });
  } catch (err) {
	console.error("Search error:", err);
	res.status(500).json({ success: false, message: "Server error" });
  }
};


  

  exports.community = async (req, res) => {
	try {
	  const { community } = req.body;
	  const userId = req.user.id;
  
	  // Validate input
	  if (!community) {
		return res.status(400).json({
		  success: false,
		  message: "Community name is required.",
		});
	  }
  
	  // Check if the community already exists
	  let communityDetails = await Community.findOne({ communityName: community });
  
	  if (!communityDetails) {
		// Create the community if it doesn't exist
		communityDetails = await Community.create({ communityName: community });
	  }
  
	  // Add the user to the community's userInCommunity array (if not already added)
	  const updatedCommunity = await Community.findByIdAndUpdate(
		communityDetails._id,
		{ $addToSet: { userInCommunity: userId } }, // $addToSet prevents duplicates
		{ new: true }
	  );
  
	  // Also update the user's community and communityDetails fields
	  const userDetails= await User.findByIdAndUpdate(
		userId,
		{ community: communityDetails.communityName, communityDetails: communityDetails._id },
		{ new: true }
	  ).populate("communityDetails").populate("additionalDetails")
  
	  return res.status(200).json({
		success: true,
		message: "Community joined/created successfully.",
		userDetails,
		communityDetails: updatedCommunity,
	  });
  
	} catch (error) {
	  console.error("Error updating community:", error);
	  return res.status(500).json({
		success: false,
		message: "Failed to join/create community. Please try again later.",
	  });
	}
  };

  exports.verification = async (req, res) => {
	try {
	  const { verificationByPostalCard, address } = req.body;
	  console.log(address);
	  console.log(verificationByPostalCard);
	  const userId = req.user.id;
	  let documentUrl = "";
		
	  // Check if a document file is provided
	  if (req.files && req.files.document) {
		const documentImage = req.files.document;
		
		// Assuming `uploadFilesToCloudinary` is an existing utility function that uploads to Cloudinary
		const uploadedDocs = await uploadFilesToCloudinary(documentImage, process.env.FOLDER_NAME);
  
		// Check if the document was successfully uploaded
		if (uploadedDocs.length > 0) {
		  documentUrl = uploadedDocs[0].secure_url;
		} else {
		  return res.status(400).json({
			success: false,
			message: "Document upload failed. Please try again.",
		  });
		}
	  }
  
	  // Fetch user details from the database
	  const userDetails = await User.findById(userId).populate("communityDetails").populate("additionalDetails");
  
	  if (!userDetails) {
		return res.status(404).json({
		  success: false,
		  message: "User not found.",
		});
	  }
  
	  // Update user details with the provided verification data
	  userDetails.documentUrl = documentUrl || userDetails.documentUrl;  // Update only if a new document is uploaded
	  userDetails.Address = address || userDetails.Address;  // Update address if provided
	  userDetails.verificationByPostalCard = verificationByPostalCard || userDetails.verificationByPostalCard; // Update verification status
  
	  // Save updated user details
	  await userDetails.save();
  
	  return res.status(200).json({
		success: true,
		message: "Verification details updated successfully.",
		userDetails,
	  });
	} catch (error) {
	  console.error("Verification Error:", error);
	  return res.status(500).json({
		success: false,
		message: "Verification failed. Please try again later.",
	  });
	}
  };

  exports.profession = async (req, res) => {
	try {
	  const { profession, hourlyCharge } = req.body;
	  const userId = req.user.id;
  
	  // Check if profession and hourlyCharge are provided
	  if (!profession || !hourlyCharge) {
		return res.status(400).json({
		  success: false,
		  message: "Profession and hourly charge are required.",
		});
	  }
  
	  // Update user details with profession and hourly charge
	  const userDetails = await User.findByIdAndUpdate(
		userId,
		{
		  profession: profession,
		  hourlyCharge: hourlyCharge,
		},
		{ new: true } // This returns the updated document
	  ).populate("communityDetails").populate("additionalDetails");
  
	  // Check if the user was found and updated
	  if (!userDetails) {
		return res.status(404).json({
		  success: false,
		  message: "User not found.",
		});
	  }
	  
  
	  // Respond with the updated user details
	  return res.status(200).json({
		success: true,
		userDetails,
		message: "Profession and hourly charge added successfully.",
	  });
	} catch (error) {
	  console.error("Error updating profession:", error);
	  return res.status(500).json({
		success: false,
		message: "An error occurred while updating profession.",
	  });
	}
  };
  


  
  

// Login controller for authenticating users
exports.login = async (req, res) => {
	try {
		const {  password } = req.body;
		const email = req.body.email?.toLowerCase();

		// Validate input fields
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "Please fill in all required fields.",
			});
		}

		// Check if the user exists
const user = await User.findOne({ email })
  .populate('additionalDetails')
  .populate('communityDetails')


	console.log(user,"-------->user");
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "User not registered. Please sign up.",
			});
		}

		// Compare the provided password with the hashed password in DB
		console.log(password);
		console.log(user.password);
		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			return res.status(401).json({
				success: false,
				message: "Incorrect password.",
			});
		}

		// Generate JWT token
		const token = jwt.sign(
			{ email: user.email, id: user._id, accountType: user.accountType },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' }
		);

		// Set cookie options
		const options = {
			expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			httpOnly: true,
		};

		// Attach token to user object and remove password from response
		user.token = token;
		user.password = undefined;

		// Send response with token and user info
		res.cookie("token", token, options).status(200).json({
			success: true,
			token,
			user,
			message: "User logged in successfully.",
		});
	} catch (error) {
		console.error("Login Error:", error);
		return res.status(500).json({
			success: false,
			message: "Login failed. Please try again later.",
		});
	}
};


// Google OAuth2 login route
exports.googleLogin = passport.authenticate('google', {
	scope: ['profile', 'email'],
  });
  
  // Google OAuth2 callback route
  exports.googleCallback = (req, res, next) => {
	passport.authenticate('google', { failureRedirect: '/signup' }, async (err, user, info) => {
	  try {
		if (err) {
		  return res.status(500).json({ message: 'Internal Server Error', error: err });
		}
		if (!user) {
		  return res.status(400).json({ message: 'User not found' });
		}
		if (!user.googleId) {
		  return res.status(400).json({ message: 'Google ID is required for Google login' });
		}
		
		// Generate JWT token
		const token = jwt.sign(
		  { email: user.email, id: user._id, accountType: user.accountType },
		  process.env.JWT_SECRET,
		  { expiresIn: '24h' }
		);
		
		user.token = token;
		await user.save();
		
		// Re-fetch the updated user (if needed)
		const updatedUser = await User.findById(user._id).populate("additionalDetails").populate('communityDetails');
		
		// Set cookies (stringify the user)
		res.cookie('user', JSON.stringify(updatedUser), {
		  expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		  secure: true,
		  sameSite: 'None',

		});
		res.cookie('token', token, {
		  expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		  httpOnly: true,
		  secure: true,
		  sameSite: 'None',
		});
		
		// Determine if onboarding is complete.
		// For example, if communityDetails exists or the other onboarding fields are set.
		const hasOnboarding =
		  (updatedUser.communityDetails && 
			(typeof updatedUser.communityDetails === "string" 
			   ? updatedUser.communityDetails.trim() !== "" 
			   : true)) ||
		  (updatedUser.city && updatedUser.state && updatedUser.postalCost && updatedUser.community);
		
		if (hasOnboarding) {
		  return res.redirect('https://truepadosi.com/google-auth-success');
		} else {
		  return res.redirect('https://truepadosi.com/google-auth-success');
		}
	  } catch (error) {
		console.error("Google Callback Error:", error);
		return res.status(500).json({ message: 'Internal Server Error', error });
	  }
	})(req, res, next);
  };






exports.sendotp = async (req, res) => {
	try {
		const { phoneNumber, email } = req.body;

		// Check if the user already exists with this phone number
		const existingUser = await User.findOne({ phoneNumber });
		if (existingUser) {
			return res.status(400).json({
				success: false,
				message: "User already registered with this phone number.",
			});
		}

		const existingUserWithEmail = await User.findOne({ email });
		if (existingUserWithEmail) {
			return res.status(400).json({
				success: false,
				message: "User already registered with this Email Id.",
			});
		}

		// Send OTP via 2Factor API
		const response = await axios.get(
			`https://2factor.in/API/V1/${process.env.API_KEY}/SMS/${phoneNumber}/AUTOGEN3/TruePadosi`
		);
		console.log(response,"--------->response of otp");

		const { Status, Details } = response.data;
		if (Status !== "Success") {
			return res.status(500).json({
				success: false,
				message: "Failed to send OTP.",
			});
		}


		res.status(200).json({
			success: true,
			Details,
			message: "OTP sent successfully on your Phone Number.",
		});

	} catch (error) {
		console.error("Error sending OTP:", error.message);
		return res.status(500).json({
			success: false,
			message: "Failed to send OTP.",
		});
	}
};



//controllers for changing the password


exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);
		// check the user is present in the database
		if (!userDetails) {
			return res.status(404).json({ success: false, message: "User not found" });
		}
		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password
		);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

		// Update password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);

		// Send notification email
		try {
			const name = `${updatedUserDetails.firstName}`
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				'Password Updated',
				passwordUpdated(
					updatedUserDetails.email,
					name,
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		// Return success response
		return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};


// for searching of the users
exports.searchUsers = async (req, res) => {
	const userId = req.user.id;
	const searchTerm = req.query.search || "";
  
	try {
	  const userDetail = await User.findById(userId).select("communityDetails");
	  if (!userDetail) return res.status(404).send("User not found");
  
	  const searchRegex = new RegExp(searchTerm, "i");
	  const query = {
		_id: { $ne: userId },
		communityDetails: userDetail.communityDetails,
		$or: [
		  { firstName: searchRegex },
		  { lastName: searchRegex },
		  { email: searchRegex },
		  { community: searchRegex },
		],
	  };
  
	  const users = await User.find(query)
		.populate("communityDetails","communityName")
		.select("firstName lastName email image") // return only needed fields
		.limit(10); // add limit for performance
  
	  res.status(200).json(users);
	} catch (error) {
	  console.error("Search error:", error);
	  res.status(500).send("Server Error in searching the community");
	}
  };


exports.getUser = async (req, res) => {
  try {
	const token = req.cookies.token;
	if (!token) return res.status(401).json({ success: false });

	const decoded = jwt.verify(token, process.env.JWT_SECRET);
const user = await User.findById(decoded.id)
  .populate("communityDetails", "communityName")
  .populate("additionalDetails")
  .populate("services", "name")
  .select("firstName lastName email image profession services city state communityDetails additionalDetails hourlyCharge community documentUrl verificationByPostalCard Address postalCost");

	if (!user) return res.status(404).json({ success: false, message: "User not found" });

	return res.status(200).json({ success: true, user, token });
  } catch (err) {
	return res.status(401).json({ success: false });
  }
};




