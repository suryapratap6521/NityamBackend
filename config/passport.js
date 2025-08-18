const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://nityam-frontend-lemon.vercel.app/api/v1/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      // Check if a user with this email already exists
      let user = await User.findOne({ email });
      
      if (user) {
        // If user exists, update googleId if not already set
        if (!user.googleId) {
          user.googleId = profile.id;
          // Optionally update image if needed:
          user.image = profile.photos[0].value;
          await user.save();
        }
      } else {
        // If no user exists, create a new one
        user = await User.create({
          googleId: profile.id,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          email: email,
          image: profile.photos[0].value,
          accountType: "People",
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

module.exports = passport;
