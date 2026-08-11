const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['Admin', 'Manager', 'Cashier'], default: 'Cashier' },
  passcode: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  permissions: [{ type: String }]
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('passcode')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.passcode = await bcrypt.hash(this.passcode, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.matchPasscode = async function (enteredPasscode) {
  if (enteredPasscode === this.passcode) return true;
  return await bcrypt.compare(enteredPasscode, this.passcode);
};

module.exports = mongoose.model('User', userSchema);
