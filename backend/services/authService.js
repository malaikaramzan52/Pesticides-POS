const User = require('../models/User');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

const generateToken = (id) => {
  return jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

const loginUser = async ({ username, passcode, password }) => {
  const inputCode = passcode || password;

  if (!inputCode || typeof inputCode !== 'string' || !inputCode.trim()) {
    throw new ApiError(400, 'Passcode or password is required');
  }

  let user;

  if (username && username.trim()) {
    user = await User.findOne({ username: username.trim().toLowerCase(), status: 'Active' });
    if (!user) {
      user = await User.findOne({ username: new RegExp(`^${username.trim()}$`, 'i'), status: 'Active' });
    }
  } else {
    // If username is omitted, search active users for matching passcode
    const activeUsers = await User.find({ status: 'Active' });
    for (const u of activeUsers) {
      const isMatch = await u.matchPasscode(inputCode);
      if (isMatch) {
        user = u;
        break;
      }
    }
  }

  if (!user) {
    throw new ApiError(401, 'Invalid passcode or username');
  }

  const isMatch = await user.matchPasscode(inputCode);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid passcode or username');
  }

  const token = generateToken(user._id);

  return {
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      permissions: user.permissions
    },
    token
  };
};

module.exports = {
  loginUser,
  generateToken
};
