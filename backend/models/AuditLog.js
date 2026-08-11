const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String, required: true },
  user: { type: String, default: 'System' },
  ip: { type: String, default: '127.0.0.1' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
