const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('Google Profile:', {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos ? profile.photos[0].value : null
      });

      let user = await User.findOne({ 
        $or: [
          { googleId: profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (user) {
        // Update existing user's info including picture
        user.picture = profile.photos ? profile.photos[0].value : null;
        user.name = profile.displayName;
        user.googleId = profile.id;
        await user.save();
        console.log('Updated user:', user);
        return done(null, user);
      }

      // Create new user with picture
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos ? profile.photos[0].value : null
      });

      console.log('Created new user:', user);
      done(null, user);
    } catch (error) {
      console.error('Passport strategy error:', error);
      done(error, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;