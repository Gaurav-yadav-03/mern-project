const express = require('express');
const passport = require('passport');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Add this line
const User = require('../models/User'); // Add this line
const { authenticateToken } = require('../middleware/auth');

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
      return res.redirect('http://localhost:5173/login?error=auth_failed');
    }
    
    if (!user) {
      console.error('No user found');
      return res.redirect('http://localhost:5173/login?error=no_user');
    }

    req.logIn(user, (loginErr) => {
      if (loginErr) {
        console.error('Login Error:', loginErr);
        return res.redirect('http://localhost:5173/login?error=login_failed');
      }
      
      // Set user data in session with correct userId field
      req.session.user = {
        _id: user._id,  // This is the key change - use _id instead of id
        name: user.name,
        email: user.email,
        picture: user.picture,
        isAdmin: user.isAdmin || false
      };
      
      // Log session data for debugging
      console.log('Session user data set:', req.session.user);
      
      // Save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.redirect('http://localhost:5173/login?error=session_error');
        }
        console.log('Session saved successfully, redirecting to home page');
        return res.redirect('http://localhost:5173');
      });
    });
  })(req, res, next);
});

// Status check endpoint
router.get('/status', (req, res) => {
  console.log('Auth status check - Session:', req.session);
  console.log('Auth status check - isAuthenticated:', req.isAuthenticated());
  console.log('Auth status check - user:', req.user);
  console.log('Auth status check - session user:', req.session?.user);

  // Check if user is authenticated through Passport
  if (req.isAuthenticated() && req.user) {
    console.log('User is authenticated via Passport');
    res.json({
      isAuthenticated: true,
      user: {
        _id: req.user._id,  // Use _id consistently
        name: req.user.name,
        email: req.user.email,
        picture: req.user.picture || null,
        isAdmin: req.user.isAdmin || false
      }
    });
  } 
  // Fallback to session-based authentication
  else if (req.session && req.session.user) {
    console.log('User is authenticated via session');
    res.json({
      isAuthenticated: true,
      user: req.session.user
    });
  } 
  // Not authenticated
  else {
    console.log('User is not authenticated');
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

    // Clear the session cookie
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
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
      
      // Set user data in session with _id instead of id
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email
      };
      
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
      
      // Set user data in session with _id instead of id
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email
      };
      
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
      
      // Set user data in session including isAdmin flag with _id instead of id
      req.session.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture,
        isAdmin: user.isAdmin
      };
      
      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        
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