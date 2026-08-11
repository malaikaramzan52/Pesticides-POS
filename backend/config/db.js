const mongoose = require('mongoose');
const dns      = require('dns');
const env      = require('./env');

// Fix: System DNS may block SRV lookups needed by mongodb+srv://
// Force Google/Cloudflare public DNS resolvers for reliable Atlas connection
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const conn = await mongoose.connect(env.mongoUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      });
      isConnected = true;
      console.log(`[MongoDB] ✅ Connected to: ${conn.connection.host}`);
      return;
    } catch (error) {
      console.error(`[MongoDB] ❌ Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      if (attempt < MAX_RETRIES) {
        console.log(`[MongoDB] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      } else {
        console.error('[MongoDB] All retries exhausted — exiting.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
