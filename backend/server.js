// Pesticides POS Backend — v1.0.1
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { seedDefaultData } = require('./services/seedService');

const startServer = async () => {
  const PORT = env.port || 5000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`[POS Backend] API URL: http://localhost:${PORT}/api/v1`);
  });

  // Connect to MongoDB and seed default data asynchronously
  connectDB().then(async () => {
    try {
      await seedDefaultData();
    } catch (seedErr) {
      console.error('[Seed Warning]:', seedErr.message);
    }
  }).catch((dbErr) => {
    console.error('[MongoDB Startup Warning]:', dbErr.message);
  });

  // Handle unhandled promise rejections gracefully
  process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]:', err.message);
  });

  // Handle uncaught exceptions gracefully
  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err.message);
  });
};

startServer();

