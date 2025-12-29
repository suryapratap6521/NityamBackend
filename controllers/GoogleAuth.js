const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Profile = require('../models/Profile');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Determines the next onboarding step for a user
 * @param {Object} user - User document
 * @returns {String} Next onboarding step or 'completed'
 */
const determineNextStep = (user) => {
  // Check if onboarding is explicitly marked as completed
  if (user.onboardingCompleted) {
    return 'completed';
  }

  // Check profile details (gender, dateOfBirth)
  if (!user.additionalDetails || 
      !user.additionalDetails.gender || 
      !user.additionalDetails.dateOfBirth) {
    return 'profile';
  }

  // Check address details (state, city, pincode)
  if (!user.state || !user.city || !user.postalCost) {
    return 'address';
  }

  // Check community details
  if (!user.community || !user.communityDetails) {
    return 'community';
  }

  // Check professional details
  if (!user.profession || !user.hourlyCharge) {
    return 'profession';
  }

  // All steps completed
  return 'completed';
};

/**
 * Mobile-friendly Google OAuth authentication endpoint
 * Accepts Google ID token from mobile app and returns user data + onboarding status
 * 
 * POST /api/v1/auth/google/mobile
 * Body: { idToken: string }
 * 
 * Response:
 * {
 *   success: true,
 *   token: "jwt_token",
 *   user: {...},
 *   isNewUser: boolean,
 *   nextStep: "profile" | "address" | "community" | "profession" | "completed"
 * }
 */
exports.googleAuthMobile = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required',
      });
    }

    // Verify Google token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('Google token verification failed:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid Google token',
      });
    }

    const payload = ticket.getPayload();
    
    // Validate essential fields
    if (!payload.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email not verified with Google',
      });
    }

    const {
      sub: googleId,
      email,
      given_name: firstName,
      family_name: lastName,
      picture: profilePicture,
    } = payload;

    // Check if user exists by email or googleId
    let user = await User.findOne({
      $or: [{ email }, { googleId }]
    }).populate('additionalDetails').populate('communityDetails');

    let isNewUser = false;

    if (user) {
      // User exists - link Google account if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.image = profilePicture || user.image;
        await user.save();
      }
    } else {
      // Create new user
      isNewUser = true;

      // Create profile document
      const profile = await Profile.create({
        gender: null,
        dateOfBirth: null,
        about: null,
        phoneNumber: null,
      });

      // Create user with Google data
      user = await User.create({
        googleId,
        firstName: firstName || email.split('@')[0],
        lastName: lastName || '',
        email,
        image: profilePicture || `https://api.dicebear.com/5.x/initials/svg?seed=${email}`,
        accountType: 'People',
        additionalDetails: profile._id,
        onboardingCompleted: false,
        onboardingStep: 'profile',
      });

      // Populate the newly created user
      user = await User.findById(user._id)
        .populate('additionalDetails')
        .populate('communityDetails');
    }

    // Determine next onboarding step
    const nextStep = determineNextStep(user);

    // Update onboarding step in database
    if (nextStep !== user.onboardingStep) {
      user.onboardingStep = nextStep;
      if (nextStep === 'completed') {
        user.onboardingCompleted = true;
      }
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        email: user.email, 
        id: user._id, 
        accountType: user.accountType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordExpires;

    // Return structured response
    return res.status(200).json({
      success: true,
      token,
      user: userResponse,
      isNewUser,
      nextStep,
      message: isNewUser 
        ? 'Account created successfully with Google' 
        : 'Logged in successfully with Google',
    });

  } catch (error) {
    console.error('Google Auth Mobile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
      error: error.message,
    });
  }
};
