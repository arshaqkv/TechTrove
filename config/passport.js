const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport')
const User = require('../models/userModel');
require('dotenv').config()

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CLIENT_URL,
    }, async (accessToken, refreshToken, profile, done) => {
        // console.log(profile)
        let newUser = {
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            isVerified: profile.emails[0].verified
        };
        
    try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (user && user.isBlocked) {
            return done(null, false, { error: 'Your account has been blocked.' }); 
        }
        if (user) {
            done(null, user);
        } else {
            user = await User.create(newUser);
            done(null, user);
            
        }
    } catch (error) {
        console.error(error);
        done(error.message, false);
    }
}));
    
passport.serializeUser((user, done) => {
    done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      console.log('TTTTTTTTTTTTT', error);
      done(error);
    }
  });
  
 
module.exports = passport