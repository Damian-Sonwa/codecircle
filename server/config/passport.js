import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from server directory  
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// passport.js is in server/config/, so ../.env goes to server/.env
dotenv.config({ path: join(__dirname, '../.env') });

// Generate user ID helper
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.userId);
});

// Deserialize user from session
passport.deserializeUser(async (userId, done) => {
  try {
    const user = await User.findOne({ userId });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy (only if credentials are provided)
// ABSOLUTELY PREVENT initialization if credentials don't exist
const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

// EXTRA STRICT CHECK - must be non-empty, non-undefined, actual strings
const hasGoogleCreds = googleClientId && 
                       googleClientSecret &&
                       typeof googleClientId === 'string' && 
                       typeof googleClientSecret === 'string' &&
                       googleClientId.length > 0 &&
                       googleClientSecret.length > 0 &&
                       googleClientId !== 'undefined' &&
                       googleClientSecret !== 'undefined';

// Skip OAuth if credentials are missing - prevent server crash
if (!hasGoogleCreds) {
  console.log('ℹ️  Google OAuth not configured - skipping initialization');
} else {
  // Only initialize Google OAuth if credentials are properly configured
  try {
    passport.use(
      'google',
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        },
      async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this Google ID
        let user = await User.findOne({ providerId: profile.id, provider: 'google' });

        if (!user) {
          // Check if email already exists
          const existingUser = await User.findOne({ email: profile.emails[0].value });
          if (existingUser) {
            // Link OAuth to existing account
            existingUser.provider = 'google';
            existingUser.providerId = profile.id;
            existingUser.avatar = profile.photos[0]?.value;
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user
          const username = profile.emails[0].value.split('@')[0] + '_' + profile.id.slice(0, 5);
          user = new User({
            userId: generateId(),
            username: username,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value,
            provider: 'google',
            providerId: profile.id,
            online: true,
            lastSeen: new Date(),
          });
          await user.save();
        } else {
          // Update last seen and online status
          user.online = true;
          user.lastSeen = new Date();
          user.avatar = profile.photos[0]?.value || user.avatar;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
      }
    )
    );
  } catch (error) {
    console.error('❌ Failed to initialize Google OAuth strategy:', error.message);
  }
}

// GitHub OAuth Strategy (only if credentials are provided)
// ABSOLUTELY PREVENT initialization if credentials don't exist
const githubClientId = (process.env.GITHUB_CLIENT_ID || '').trim();
const githubClientSecret = (process.env.GITHUB_CLIENT_SECRET || '').trim();

// EXTRA STRICT CHECK - must be non-empty, non-undefined, actual strings
const hasGitHubCreds = githubClientId && 
                       githubClientSecret &&
                       typeof githubClientId === 'string' && 
                       typeof githubClientSecret === 'string' &&
                       githubClientId.length > 0 &&
                       githubClientSecret.length > 0 &&
                       githubClientId !== 'undefined' &&
                       githubClientSecret !== 'undefined';

// Skip OAuth if credentials are missing - prevent server crash
if (!hasGitHubCreds) {
  console.log('ℹ️  GitHub OAuth not configured - skipping initialization');
} else {
  // Only initialize GitHub OAuth if credentials are properly configured
  try {
    passport.use(
      'github',
      new GitHubStrategy(
        {
          clientID: githubClientId,
          clientSecret: githubClientSecret,
          callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback',
        },
      async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists with this GitHub ID
        let user = await User.findOne({ providerId: profile.id.toString(), provider: 'github' });

        if (!user) {
          // Check if username already exists
          const existingUser = await User.findOne({ username: profile.username });
          if (existingUser) {
            // Link OAuth to existing account
            existingUser.provider = 'github';
            existingUser.providerId = profile.id.toString();
            existingUser.avatar = profile.photos[0]?.value;
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user
          user = new User({
            userId: generateId(),
            username: profile.username,
            email: profile.emails?.[0]?.value || `${profile.username}@github.local`,
            avatar: profile.photos[0]?.value,
            provider: 'github',
            providerId: profile.id.toString(),
            online: true,
            lastSeen: new Date(),
          });
          await user.save();
        } else {
          // Update last seen and online status
          user.online = true;
          user.lastSeen = new Date();
          user.avatar = profile.photos[0]?.value || user.avatar;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
      }
    )
    );
  } catch (error) {
    console.error('❌ Failed to initialize GitHub OAuth strategy:', error.message);
  }
}

export default passport;

