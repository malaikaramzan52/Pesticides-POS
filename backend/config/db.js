const mongoose = require('mongoose');
const dns      = require('dns');
const env      = require('./env');

// Safely attempt setting custom DNS servers (needed in some local Windows environments)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.log('[DNS] Custom DNS setServers skipped:', e.message);
}

let isConnecting = false;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (isConnecting) {
    // Wait until existing connection attempt finishes
    let checks = 0;
    while (isConnecting && checks < 30) {
      await new Promise((res) => setTimeout(res, 500));
      if (mongoose.connection.readyState === 1) return;
      checks++;
    }
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log(`[MongoDB] ✅ Connected to: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] ❌ Connection error: ${error.message}`);
    // Do not call process.exit in serverless environment to prevent crashing the worker
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  } finally {
    isConnecting = false;
  }
};

module.exports = connectDB;
