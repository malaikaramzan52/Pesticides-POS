const AuditLog = require('../models/AuditLog');

const logAction = async (action, details, user = 'System', ip = '127.0.0.1') => {
  try {
    await AuditLog.create({
      action,
      details,
      user,
      ip
    });
  } catch (error) {
    console.error('AuditLog Error:', error);
  }
};

module.exports = {
  logAction
};
