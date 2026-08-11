const ApiError = require('../utils/apiError');
const env = require('../config/env');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (!statusCode) statusCode = 500;

  const response = {
    success: false,
    message: message || 'Internal Server Error',
    ...(env.nodeEnv === 'development' && { stack: err.stack })
  };

  if (env.nodeEnv === 'development') {
    console.error(`[Error]: ${message}`, err.stack);
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
