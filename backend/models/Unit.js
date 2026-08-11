const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  key: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Unit', unitSchema);
