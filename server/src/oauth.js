import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './database.js';

passport.use(new GoogleStrategy.Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    if (!profile.id || !profile.emails?.[0]?.value) {
      return done(new Error('Invalid Google profile data'));
    }

    // Check if user exists by google_id
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1', [profile.id]);
    let user = result.rows[0];

    if (user) {
      // User exists, update profile info if needed
      await pool.query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [profile.photos?.[0]?.value || user.avatar_url, user.id]
      );
    } else {
      // Check if email already exists
      result = await pool.query('SELECT * FROM users WHERE email = $1', [profile.emails?.[0]?.value]);
      user = result.rows[0];

      if (user) {
        // User exists with same email, link Google account
        await pool.query(
          'UPDATE users SET google_id = $1, provider = $2, avatar_url = $3 WHERE id = $4',
          [profile.id, 'google', profile.photos?.[0]?.value, user.id]
        );
      } else {
        // Google sign-up is disabled - only existing users can use Google login
        return done(new Error('Google sign-up is disabled. Please register with email and password, or contact support if you have an existing account.'));
      }
    }

    done(null, user);
  } catch (error) {
    console.error('OAuth strategy error:', error.message);
    done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    if (!user) {
      return done(new Error('User not found'));
    }
    done(null, user);
  } catch (error) {
    console.error('Deserialize user error:', error.message);
    done(error);
  }
});

export default passport;
