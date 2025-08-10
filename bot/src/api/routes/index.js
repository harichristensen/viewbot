const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { snakeToCamelMiddleware, camelToSnakeMiddleware } = require('../../utils/naming');
const schedulerRoutes = require('./scheduler');
const simulationRoutes = require('./simulation');
const configRoutes = require('./config');
const statsRoutes = require('./stats');

// Apply naming convention middleware globally
router.use(snakeToCamelMiddleware);
router.use(camelToSnakeMiddleware);

// Public routes
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Protected routes (require authentication)
router.use('/scheduler', authMiddleware, schedulerRoutes);
router.use('/simulation', authMiddleware, simulationRoutes);
router.use('/config', authMiddleware, configRoutes);
router.use('/stats', authMiddleware, statsRoutes);

module.exports = router;