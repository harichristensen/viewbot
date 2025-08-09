const express = require('express');
const router = express.Router();
const AnalyticsService = require('../../engine/analytics/analyticsService');
const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');

// Initialize analytics service
const analyticsService = new AnalyticsService();

// Get all active simulations
router.get('/', (req, res) => {
  try {
    const simulations = analyticsService.getAllSimulations();
    
    res.json({
      success: true,
      data: simulations
    });
  } catch (error) {
    logger.error('Failed to get simulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve simulations'
    });
  }
});

// Get simulation status for specific media
router.get('/:mediaId', (req, res) => {
  try {
    const { mediaId } = req.params;
    const status = analyticsService.getSimulationStatus(parseInt(mediaId));
    
    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found for this media'
      });
    }
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get simulation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve simulation status'
    });
  }
});

// Start a new viral simulation
router.post('/start', async (req, res) => {
  try {
    const {
      targetMediaId,
      maxViews,
      maxLikes,
      likeRatio = 0.05,
      growthDurationHours = 72,
      growthCurve = 'sigmoid'
    } = req.body;
    
    // Validate required fields
    if (!targetMediaId || !maxViews) {
      return res.status(400).json({
        success: false,
        error: 'targetMediaId and maxViews are required'
      });
    }
    
    // Check if simulation already exists
    const existingSimulation = analyticsService.getSimulationStatus(targetMediaId);
    if (existingSimulation) {
      return res.status(400).json({
        success: false,
        error: 'Simulation already active for this media'
      });
    }
    
    // Start the simulation
    const result = await analyticsService.startViralSimulation({
      targetMediaId,
      maxViews,
      maxLikes: maxLikes || Math.floor(maxViews * likeRatio),
      likeRatio,
      growthDurationHours,
      growthCurve
    });
    
    // Create bot config for tracking
    const config = await db.BotConfig.create({
      name: `Viral Simulation - Media ${targetMediaId}`,
      configType: 'analytics',
      isActive: true,
      config: {
        targetMediaId,
        maxViews,
        maxLikes: maxLikes || Math.floor(maxViews * likeRatio),
        likeRatio,
        growthDurationHours,
        growthCurve
      }
    });
    
    res.json({
      success: true,
      data: {
        ...result,
        configId: config.id
      }
    });
  } catch (error) {
    logger.error('Failed to start simulation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start simulation'
    });
  }
});

// Stop a simulation
router.post('/:mediaId/stop', (req, res) => {
  try {
    const { mediaId } = req.params;
    const stopped = analyticsService.stopSimulation(parseInt(mediaId));
    
    if (!stopped) {
      return res.status(404).json({
        success: false,
        error: 'No active simulation found for this media'
      });
    }
    
    res.json({
      success: true,
      message: 'Simulation stopped successfully'
    });
  } catch (error) {
    logger.error('Failed to stop simulation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop simulation'
    });
  }
});

// Update simulations (trigger manual update)
router.post('/update', async (req, res) => {
  try {
    const results = await analyticsService.updateSimulations();
    
    res.json({
      success: true,
      message: 'Simulations updated',
      data: {
        totalSimulations: results.length,
        results
      }
    });
  } catch (error) {
    logger.error('Failed to update simulations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update simulations'
    });
  }
});

// Get simulation history
router.get('/history/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { limit = 100 } = req.query;
    
    const analyticsEntries = await db.AnalyticsEntry.findAll({
      where: {
        postId: mediaId,
        metadata: {
          source: 'viral_simulation'
        }
      },
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: analyticsEntries
    });
  } catch (error) {
    logger.error('Failed to get simulation history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve simulation history'
    });
  }
});

// Schedule periodic updates for analytics
setInterval(async () => {
  try {
    await analyticsService.updateSimulations();
  } catch (error) {
    logger.error('Scheduled analytics update failed:', error);
  }
}, 5 * 60 * 1000); // Every 5 minutes

module.exports = router;