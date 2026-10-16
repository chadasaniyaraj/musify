const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST /api/auth/register - Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are all required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please log in.'
      });
    }

    // Avatar styling
    const trimmedName = name.trim();
    const initials = trimmedName
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('') || 'U';

    const colors = ['#1ed760', '#1db954', '#1e88e5', '#8e24aa', '#e53935', '#fb8c00'];
    const chosenColor = colors[Math.floor(Math.random() * colors.length)];

    const user = new User({
      name: trimmedName,
      email: cleanEmail,
      avatarText: initials,
      avatarColor: chosenColor,
      plan: 'Spotify Premium',
      favorites: [],
      recentlyPlayed: []
    });

    user.setPassword(password);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      user: user.toProfileJSON()
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user account.',
      error: error.message
    });
  }
});

// POST /api/auth/login - Log in with email and password
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address.'
      });
    }

    const isValid = user.validatePassword(password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      user: user.toProfileJSON()
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed due to a server error.',
      error: error.message
    });
  }
});

// POST /api/auth/demo - Instant demo user login
router.post('/demo', async (req, res) => {
  try {
    const demoEmail = 'alex.rivera@spotify.user';
    let user = await User.findOne({ email: demoEmail });

    if (!user) {
      user = new User({
        name: 'Alex Rivera',
        email: demoEmail,
        avatarText: 'AR',
        avatarColor: '#1ed760',
        plan: 'Spotify Premium',
        favorites: [
          {
            id: 'BddP6PYo2gs',
            title: 'Kesariya',
            artist: 'Arijit Singh, Pritam',
            coverUrl: 'https://i.ytimg.com/vi/BddP6PYo2gs/mqdefault.jpg',
            duration: '4:28'
          },
          {
            id: 'mH_LFkWxpI0',
            title: 'Lover',
            artist: 'Diljit Dosanjh',
            coverUrl: 'https://i.ytimg.com/vi/mH_LFkWxpI0/mqdefault.jpg',
            duration: '3:22'
          }
        ]
      });
      user.setPassword('demo1234');
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Demo login active.',
      user: user.toProfileJSON()
    });
  } catch (error) {
    console.error('Demo Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Demo login error.',
      error: error.message
    });
  }
});

// GET /api/auth/me - Get current user profile by email or user ID
router.get('/me', async (req, res) => {
  try {
    const { email, id } = req.query;
    if (!email && !id) {
      return res.status(400).json({
        success: false,
        message: 'Email or User ID query parameter is required.'
      });
    }

    const query = id ? { _id: id } : { email: email.trim().toLowerCase() };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    res.status(200).json({
      success: true,
      user: user.toProfileJSON()
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
      error: error.message
    });
  }
});

module.exports = router;
