const morgan = require('morgan');

const loggerMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms');

module.exports = loggerMiddleware;
