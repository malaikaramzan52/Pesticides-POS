const mongoose = require('mongoose');
const dns      = require('dns');
const env      = require('./env');

// Safely attempt setting custom DNS servers ONLY in local dev (skip on Vercel/Production)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  } catch (e) {
    console.log('[DNS] Custom DNS setServers skipped:', e.message);
  }
}

let cachedPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!cachedPromise) {
    cachedPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      maxPoolSize: 10,
    }).then((conn) => {
      console.log(`[MongoDB] ✅ Connected to: ${conn.connection.host}`);
      return conn;
    }).catch((error) => {
      cachedPromise = null;
      console.error(`[MongoDB] ❌ Connection error: ${error.message}`);
      throw error;
    });
  }

  return cachedPromise;
};

module.exports = connectDB;

