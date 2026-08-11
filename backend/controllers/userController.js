const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-passcode').sort({ createdAt: -1 });
    return successResponse(res, 'Users fetched successfully', users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { username, name, role, passcode, permissions } = req.body;
    const existing = await User.findOne({ username });
    if (existing) throw new ApiError(400, 'Username is already taken');

    const user = await User.create({ username, name, role, passcode, permissions });
    const userObj = user.toObject();
    delete userObj.passcode;

    return successResponse(res, 'User created successfully', userObj, 201);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');

    const fields = ['name', 'role', 'status', 'permissions'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    if (req.body.passcode) user.passcode = req.body.passcode;

    await user.save();
    const userObj = user.toObject();
    delete userObj.passcode;

    return successResponse(res, 'User updated successfully', userObj);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new ApiError(404, 'User not found');
    return successResponse(res, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
