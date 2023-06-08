const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error('Error retrieving users', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
