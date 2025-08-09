const express = require('express');
const router = express.Router();
const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');

// Get all bot configurations
router.get('/', async (req, res) => {
  try {
    const { configType, isActive } = req.query;
    
    const where = {};
    if (configType) where.configType = configType;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const configs = await db.BotConfig.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error('Failed to get configurations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configurations'
    });
  }
});

// Get single configuration
router.get('/:id', async (req, res) => {
  try {
    const config = await db.BotConfig.findByPk(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to get configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration'
    });
  }
});

// Create new configuration
router.post('/', async (req, res) => {
  try {
    const { name, configType, config, schedule, isActive = true } = req.body;
    
    // Validate required fields
    if (!name || !configType || !config) {
      return res.status(400).json({
        success: false,
        error: 'name, configType, and config are required'
      });
    }
    
    // Validate config type
    if (!['posting', 'analytics', 'behavior'].includes(configType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configType. Must be: posting, analytics, or behavior'
      });
    }
    
    // Create configuration
    const botConfig = await db.BotConfig.create({
      name,
      configType,
      config,
      schedule,
      isActive
    });
    
    res.status(201).json({
      success: true,
      data: botConfig
    });
  } catch (error) {
    logger.error('Failed to create configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create configuration'
    });
  }
});

// Update configuration
router.put('/:id', async (req, res) => {
  try {
    const config = await db.BotConfig.findByPk(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    // Update fields
    const updates = {};
    const allowedFields = ['name', 'config', 'schedule', 'isActive'];
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    await config.update(updates);
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to update configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Delete configuration
router.delete('/:id', async (req, res) => {
  try {
    const config = await db.BotConfig.findByPk(req.params.id);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuration not found'
      });
    }
    
    await config.destroy();
    
    res.json({
      success: true,
      message: 'Configuration deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete configuration'
    });
  }
});

// Get configuration templates
router.get('/templates/:type', (req, res) => {
  try {
    const { type } = req.params;
    const templates = db.BotConfig.CONFIG_TEMPLATES;
    
    if (!templates[type]) {
      return res.status(404).json({
        success: false,
        error: 'Template not found for this type'
      });
    }
    
    res.json({
      success: true,
      data: templates[type]
    });
  } catch (error) {
    logger.error('Failed to get template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve template'
    });
  }
});

module.exports = router;