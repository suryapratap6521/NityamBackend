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


require("dotenv").config();
// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);


const mongoose = require('mongoose');

//signup controller for registering the Users
// exports.signup = async (req, res) => {
//     console.log(req.body);
//     try {
//         // Destructure fields from the request body
//         const {
//             firstName,
//             lastName,
//             email,
//             password,
//             city,
//             state,
//             community,
//             phoneNumber,
//             postalCost,
//             confirmPassword,
// 			profession,
// 			hourlyCharge,
//             otp,
//         } = req.body;
// 		console.log(firstName,
//             lastName,
//             email,
//             password,
//             city,
//             state,
//             community,
//             phoneNumber,
//             postalCost,
//             confirmPassword,
// 			profession,
// 			hourlyCharge,
//             otp);
//         // Check if All Details are there or not
//         if (
//             !firstName ||
//             !lastName ||
//             !email ||
//             !password ||
//             !confirmPassword ||
//             !otp ||
//             !phoneNumber ||
//             !state ||
//             !city ||
//             !community ||
//             !postalCost
//         ) {
//             return res.status(403).send({
//                 success: false,
//                 message: "All Fields are required",
//             });
//         }
//         // Check if password and confirm password match
//         if (password !== confirmPassword) {
//             return res.status(400).json({
//                 success: false,
//                 message:
//                     "Password and Confirm Password do not match. Please try again.",
//             });
//         }

//         // Check if user already exists
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(400).json({
//                 success: false,
//                 message: "User already exists. Please sign in to continue.",
//             });
//         }
// 		const existingUserWithNumber=await User.findOne({phoneNumber})
// 		if(existingUserWithNumber){
// 			return res.status(400).json({
// 				success:false,
// 				message:"User already exists with this Phone number",
// 			})
// 		}
		

//         // Find the most recent OTP for the email
//         const response = await OTP.find({ phoneNumber }).sort({ createdAt: -1 }).limit(1);
//         console.log(response,"--------->response of otp");
//         if (response.length === 0 || otp !== response[0].otp) {
//             // OTP not found for the email or invalid OTP
//             return res.status(400).json({
//                 success: false,
//                 message: "The OTP is not valid",
//             });
//         }

//         // Hash the password
//         const hashedPassword = await bcrypt.hash(password, 10);

//         // Check if the community already exists
//         let communityDetails = await Community.findOne({ communityName: community });

//         if (!communityDetails) {
//             // Create the community if it doesn't exist
//             communityDetails = await Community.create({ communityName: community });
//         }

//         // Create the Additional Profile For User
//         const profileDetails = await Profile.create({
//             gender: null,
//             dateOfBirth: null,
//             about: null,
//             phoneNumber: null,
//         });

//         // Create the user
//         const user = await User.create({
//             firstName,
//             lastName,
//             email,
//             phoneNumber,
//             password: hashedPassword,
//             accountType: "People",
//             additionalDetails: profileDetails._id,
//             image: `https://api.dicebear.com/5.x/initials/svg?seed=${firstName} ${lastName}`,
//             city,
//             state,
//             postalCost,
//             communityDetails: communityDetails._id,
// 			profession,
// 			hourlyCharge, // Assign the community details to the user
//         });
// 		console.log(user);

//         // Add user ObjectId to the community's userInCommunity array
//         await Community.findByIdAndUpdate(
//             communityDetails._id,
//             { $addToSet: { userInCommunity: user._id } },
//             { new: true }
//         );

//         return res.status(200).json({
//             success: true,
//             user,
//             message: "User registered successfully",
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             success: false,
//             message: "User cannot be registered. Please try again.",
//         });
//     }
// };



// Signup controller for registering new users
exports.signup = async (req, res) => {
	try {
		const { firstName, lastName, email, phoneNumber, password, confirmPassword, otp } = req.body;
		console.log(req.body)
		// Basic validation
		if (!firstName || !email || !phoneNumber || !password || !confirmPassword) {
			return res.status(400).json({
				success: false,
				message: "All fields are required.",
			});
		}

		// Password and Confirm Password match validation
		if (password !== confirmPassword) {
			return res.status(400).json({
				success: false,
				message: "Passwords do not match.",
			});
		}

		// Check if user already exists with the email
		const existingUserByEmail = await User.findOne({ email });
		if (existingUserByEmail) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this email. Please login.",
			});
		}

		// Check if user already exists with the phone number
		const existingUserByPhone = await User.findOne({ phoneNumber });
		if (existingUserByPhone) {
			return res.status(400).json({
				success: false,
				message: "User already exists with this phone number.",
			});
		}

		// Validate OTP for the phone number
		const latestOTP = await OTP.findOne({phoneNumber}).sort({ createdAt: -1 });
		console.log(otp,"---------otp");
		console.log(latestOTP,"------>latest");
		if (!latestOTP || otp !== latestOTP.otp) {
			return res.status(400).json({
				success: false,
				message: "Invalid or expired OTP.",
			});
		}

		// Hash the password before saving it
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create user profile
		const profile = await Profile.create({
			gender: null,
			dateOfBirth: null,
			about: null,
			phoneNumber: null,
		});

		// Create new user
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

		// Generate JWT token
		const token = jwt.sign(
			{ email: user.email, id: user._id, accountType: user.accountType },
			process.env.JWT_SECRET,
			{ expiresIn: '24h' }
		);

		// Attach token to user and set cookie
		user.token = token;
		user.password = undefined; // Do not send password in response

		const options = {
			expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
			httpOnly: true,
		};

		// Respond with the token and user data
		res.cookie("token", token, options).status(201).json({
			success: true,
			token,
			user,
			message: "User registered successfully and logged in.",
		});
	} catch (error) {
		console.error("Signup Error:", error);
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
		const { email, password } = req.body;

		// Validate input fields
		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: "Please fill in all required fields.",
			});
		}

		// Check if the user exists
		const user = await User.findOne({ email }).populate("additionalDetails").populate('communityDetails');
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "User not registered. Please sign up.",
			});
		}

		// Compare the provided password with the hashed password in DB
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
	passport.authenticate('google', { failureRedirect: '/login' }, async (err, user, info) => {
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
		//   secure: true,
		//   sameSite: 'None',

		});
		res.cookie('token', token, {
		  expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		  httpOnly: false,
		//   secure: true,
		//   sameSite: 'None',
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
		  return res.redirect('https://nityam-frontend-lemon.vercel.app/google-auth-success');
		} else {
		  return res.redirect('https://nityam-frontend-lemon.vercel.app/google-auth-success');
		}
	  } catch (error) {
		console.error("Google Callback Error:", error);
		return res.status(500).json({ message: 'Internal Server Error', error });
	  }
	})(req, res, next);
  };




//sending otp for email verification
// exports.sendotp = async (req, res) => {
// 	try {
// 		const { email } = req.body;

// 		// Check if user is already present
// 		// Find user with provided email
// 		const checkUserPresent = await User.findOne({ email });
// 		// to be used in case of signup

// 		// If user found with provided email
// 		if (checkUserPresent) {
// 			// Return 401 Unauthorized status code with error message
// 			return res.status(401).json({
// 				success: false,
// 				message: `User is Already Registered`,
// 			});
// 		}

// 		var otp = otpGenerator.generate(6, {
// 			upperCaseAlphabets: false,
// 			lowerCaseAlphabets: false,
// 			specialChars: false,
// 		});
// 		const result = await OTP.findOne({ otp: otp });
// 		console.log("Result is Generate OTP Func");
// 		console.log("OTP", otp);
// 		console.log("Result", result);
// 		while (result) {
// 			otp = otpGenerator.generate(6, {
// 				upperCaseAlphabets: false,
// 			});
// 			result = await OTP.findOne({ otp: otp });
// 		}
		
// 		const otpPayload = { email, otp };
// 		const otpBody = await OTP.create(otpPayload);
// 		console.log("OTP Body", otpBody);
// 		res.status(200).json({
// 			success: true,
// 			message: `OTP Sent Successfully`,
// 			otp,
// 		});
// 	} catch (error) {
// 		console.log(error.message);
// 		return res.status(500).json({ success: false, error: error.message });
// 	}
// };


exports.sendotp = async (req, res) => {
    try {
        const { phoneNumber,email } = req.body;
		console.log(phoneNumber, "---->");
        
        // Check if the user already exists with this phone number
        const existingUser = await User.findOne({phoneNumber});
		console.log(existingUser,"----->ppopop");
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "User already registered with this phone number.",
            });
        }
		const existingUserWithEmail = await User.findOne({email});
		console.log(existingUserWithEmail,"----->ppopop");
        if (existingUserWithEmail) {
            return res.status(400).json({
                success: false,
                message: "User already registered with this Email Id.",
            });
        }
		

        // Generate a 6-digit OTP
		let otp = otpGenerator.generate(6, {
			upperCaseAlphabets: false,
			lowerCaseAlphabets: false,
			specialChars: false,
		});
		console.log(otp, "--->>>>>>");
        
        // Save OTP to the database
        const otpPayload = { phoneNumber,email, otp };
        const otpp=await OTP.create(otpPayload);

        // Send OTP via SMS using Twilio
        await client.messages.create({
            from: '+14177398093', // Your Twilio phone number  +13148992511
            to: `+91${phoneNumber}`, // Ensure correct international format
            body: `Your OTP code is ${otp}`,
        });

        res.status(200).json({
            success: true,
			otpp,
            message: "OTP sent successfully on your Phone Number and Email Id.",
        });
    } catch (error) {
        console.error("Error sending OTP:", error);
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
	console.log(userId);
    try {
        // Await the promise returned by User.findById
        const userDetail = await User.findById(userId);
        console.log(userDetail);
        // console.log(userDetail);
        const keyword = req.query.search ? {
            $or: [
                { firstName: { $regex: new RegExp(req.query.search, 'i') } },
                { lastName: { $regex: new RegExp(req.query.search, 'i') } },
                { email: { $regex: new RegExp(req.query.search, 'i') } },
                { community: { $regex: new RegExp(req.query.search, 'i') } },
            ]
        } : {};

        // Check if userDetail is populated properly
        console.log(userDetail.communityDetails); 
        
        const users = await User.find({ $and: [keyword, { _id: { $ne: req.user.id } },{communityDetails:userDetail.communityDetails}] }).populate("communityDetails");
        res.send(users);
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error in searching the community");
    }
};




