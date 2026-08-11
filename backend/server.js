// Pesticides POS Backend — v1.0.1
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { seedDefaultData } = require('./services/seedService');

const startServer = async () => {
  // Connect to Local MongoDB
  await connectDB();
  await seedDefaultData();

  const server = app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    console.log(`[POS Backend] API URL: http://localhost:${env.port}/api/v1`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('[Unhandled Rejection]:', err.message);
    server.close(() => process.exit(1));
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err.message);
    process.exit(1);
  });
};

startServer();
