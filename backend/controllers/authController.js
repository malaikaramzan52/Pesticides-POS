const authService = require('../services/authService');
const { successResponse } = require('../utils/apiResponse');

const login = async (req, res, next) => {
  try {
    const { username, passcode, password } = req.body;
    const result = await authService.loginUser({ username, passcode, password });
    return successResponse(res, 'Login successful', result);
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return successResponse(res, 'Current user profile', { user: req.user });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe
};
