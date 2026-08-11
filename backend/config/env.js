const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  // Support both MONGODB_URI (Atlas/Vercel) and MONGO_URI (legacy) — never hardcode the URI
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/pesticides_pos',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_pesticides_pos_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
