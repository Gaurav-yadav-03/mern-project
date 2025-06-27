const express = require('express');
const passport = require('passport');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Add this line
const User = require('../models/User'); // Add this line
const { authenticateToken } = require('../middleware/auth');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Google authentication route
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account',
    accessType: 'offline'
  })
);

// Enhanced callback handling
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', async (err, user, info) => {
    if (err) {
      console.error('Authentication Error:', err);
      return res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
    }
    
    if (!user) {
      console.error('No user found');
      return res.redirect(`${FRONTEND_URL}/login?error=no_user`);
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login Error:', loginErr);
        return res.redirect(`${FRONTEND_URL}/login?error=login_failed`);
      }
      
      // Save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.redirect(`${FRONTEND_URL}/login?error=session_error`);
        }
        console.log('Session saved successfully, redirecting to home page');
        // Set cookie options for cross-site
        res.cookie('connect.sid', req.sessionID, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 24 * 60 * 60 * 1000
        });
        return res.redirect(`${FRONTEND_URL}`);
      });
    });
  })(req, res, next);
});

// Status check endpoint
router.get('/status', (req, res) => {
  // Only check Passport's req.user
  if (req.isAuthenticated() && req.user) {
    res.json({
      isAuthenticated: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture || null,
        isAdmin: req.user.isAdmin || false
      }
    });
  } else {
    res.json({ isAuthenticated: false, user: null });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Auth Error:', err);
  res.status(500).json({ 
    error: 'Authentication failed', 
    details: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

// Add logout route
router.post('/logout', (req, res) => {
  // First destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
      return res.status(500).json({ error: 'Logout failed', details: err.message });
    }

    // Clear the session cookie for cross-site
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: true, // Always true for cross-site
      sameSite: 'none' // Required for cross-site
    });

    // Send success response
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name
    });

    // Log the user in
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login Error:', err);
        return res.status(500).json({ error: 'Login failed after signup' });
      }
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        res.json({ 
          user: {
            _id: user._id,
            name: user.name,
            email: user.email
          }
        });
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

// Add a 'register' route as an alias for 'signup'
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name
    });

    // Log the user in
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login Error:', err);
        return res.status(500).json({ error: 'Login failed after signup' });
      }
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        // Set cookie options for cross-site
        res.cookie('connect.sid', req.sessionID, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 24 * 60 * 60 * 1000
        });
        res.json({ 
          user: {
            _id: user._id,
            name: user.name,
            email: user.email
          }
        });
      });
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Return user data without sensitive information
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// In your login route handler
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if user has a password (might not if they used Google auth)
    if (!user.password) {
      return res.status(401).json({ error: 'Please login with Google or reset your password' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Log in the user using Passport
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login Error:', err);
        return res.status(500).json({ error: 'Login failed' });
      }
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        // Set cookie options for cross-site
        res.cookie('connect.sid', req.sessionID, {
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 24 * 60 * 60 * 1000
        });
        // Return user info with isAdmin flag and _id instead of id
        res.json({ 
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            isAdmin: user.isAdmin
          } 
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;