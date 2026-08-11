const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const env = require('./config/env');
const loggerMiddleware = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');

const app = express();

// CORS configuration — allow requests cleanly with credentials
app.use(cors({
  origin: true, // Reflect request origin to allow any origin dynamically
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-passcode'],
}));

// Explicitly handle preflight OPTIONS for all routes
app.options('*', cors());

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (env.nodeEnv !== 'test') {
  app.use(loggerMiddleware);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes mount (/api/v1)
app.use('/api/v1', routes);

// 404 Handler for undefined endpoints
app.use('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
