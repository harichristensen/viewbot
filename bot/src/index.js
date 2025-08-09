require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const db = require('../../shared/database/models');
const logger = require('./utils/logger');
const { getScheduler } = require('./engine/posting/scheduler');
const apiRoutes = require('./api/routes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.url}`);
  next();
});

// Serve static files for dashboard
app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root route - redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found'
    }
  });
});

// Initialize services
async function initialize() {
  try {
    logger.info('🚀 Starting ViewBot Bot System...');
    
    // Test database connection
    await db.sequelize.authenticate();
    logger.info('✅ Database connection established');
    
    // Sync database models (in development only)
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      logger.info('✅ Database models synchronized');
    }
    
    // Initialize posting scheduler
    const scheduler = getScheduler();
    await scheduler.initialize();
    logger.info('✅ Posting scheduler initialized');
    
    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`✅ Bot server listening on port ${PORT}`);
      logger.info(`🌐 Dashboard available at http://localhost:${PORT}/dashboard`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Starting graceful shutdown...');
      
      // Stop scheduler
      scheduler.stopAll();
      
      // Close server
      server.close(() => {
        logger.info('HTTP server closed');
      });
      
      // Close database connection
      await db.sequelize.close();
      logger.info('Database connection closed');
      
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to initialize bot system:', error);
    process.exit(1);
  }
}

// Start the application
initialize();

module.exports = app;