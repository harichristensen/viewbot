const express = require('express');
const router = express.Router();
const { getScheduler } = require('../../engine/posting/scheduler');
const logger = require('../../utils/logger');

// Get scheduler status
router.get('/status', (req, res) => {
  try {
    const scheduler = getScheduler();
    const status = scheduler.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve scheduler status'
    });
  }
});

// Start scheduler
router.post('/start', async (req, res) => {
  try {
    const scheduler = getScheduler();
    
    if (scheduler.isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Scheduler is already running'
      });
    }
    
    await scheduler.initialize();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    logger.error('Failed to start scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler'
    });
  }
});

// Stop scheduler
router.post('/stop', (req, res) => {
  try {
    const scheduler = getScheduler();
    
    if (!scheduler.isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Scheduler is not running'
      });
    }
    
    scheduler.stopAll();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    logger.error('Failed to stop scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    });
  }
});

// Reload scheduler configuration
router.post('/reload', async (req, res) => {
  try {
    const scheduler = getScheduler();
    await scheduler.reload();
    
    res.json({
      success: true,
      message: 'Scheduler configuration reloaded successfully'
    });
  } catch (error) {
    logger.error('Failed to reload scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reload scheduler configuration'
    });
  }
});

// Trigger immediate posting (for testing)
router.post('/trigger', async (req, res) => {
  try {
    const scheduler = getScheduler();
    const { configId } = req.body;
    
    if (!configId) {
      return res.status(400).json({
        success: false,
        error: 'Config ID is required'
      });
    }
    
    // Get the config
    const db = require('../../../../shared/database/models');
    const config = await db.BotConfig.findByPk(configId);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    // Execute the job immediately
    await scheduler.executePostingJob(config);
    
    res.json({
      success: true,
      message: 'Posting job triggered successfully'
    });
  } catch (error) {
    logger.error('Failed to trigger posting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger posting job'
    });
  }
});

module.exports = router;