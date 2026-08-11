const app = require('../app');
const connectDB = require('../config/db');
const { seedDefaultData } = require('../services/seedService');

let isSeeded = false;

module.exports = async (req, res) => {
  try {
    await connectDB();
    if (!isSeeded) {
      await seedDefaultData();
      isSeeded = true;
    }
  } catch (err) {
    console.error('[Vercel Serverless] DB connection/seed error:', err.message);
  }

  return app(req, res);
};
