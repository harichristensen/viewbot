const express = require('express');
const router = express.Router();
const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');
const { Op } = db.Sequelize;

// Get bot activity statistics
router.get('/activity', async (req, res) => {
  try {
    const { startDate, endDate, interval = 'hour' } = req.query;
    
    // Default to last 24 hours
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
    
    // Get posts created by bots in timeframe
    const botPosts = await db.Post.findAll({
      attributes: [
        [db.sequelize.fn('DATE_TRUNC', interval, db.sequelize.col('createdAt')), 'interval'],
        [db.sequelize.fn('COUNT', '*'), 'count']
      ],
      include: [{
        model: db.User,
        as: 'user',
        where: { isBot: true },
        attributes: []
      }],
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      group: ['interval'],
      order: [['interval', 'ASC']],
      raw: true
    });
    
    res.json({
      success: true,
      data: {
        timeframe: { start, end },
        interval,
        posts: botPosts
      }
    });
  } catch (error) {
    logger.error('Failed to get activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity statistics'
    });
  }
});

// Get bot user statistics
router.get('/users', async (req, res) => {
  try {
    const botUserStats = await db.User.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', '*'), 'total'],
        [db.sequelize.fn('COUNT', db.sequelize.literal('CASE WHEN "isActive" THEN 1 END')), 'active'],
        [db.sequelize.fn('COUNT', db.sequelize.literal('CASE WHEN "lastLoginAt" > NOW() - INTERVAL \'24 hours\' THEN 1 END')), 'activeToday']
      ],
      where: { isBot: true },
      raw: true
    });
    
    // Get most active bot users
    const mostActive = await db.User.findAll({
      attributes: [
        'id',
        'username',
        'displayName',
        'lastLoginAt',
        [db.sequelize.literal('(SELECT COUNT(*) FROM posts WHERE posts."userId" = "User"."id")'), 'postCount']
      ],
      where: { isBot: true },
      order: [[db.sequelize.literal('postCount'), 'DESC']],
      limit: 10,
      raw: true
    });
    
    res.json({
      success: true,
      data: {
        summary: botUserStats[0],
        mostActive
      }
    });
  } catch (error) {
    logger.error('Failed to get user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user statistics'
    });
  }
});

// Get viral simulation statistics
router.get('/simulations', async (req, res) => {
  try {
    // Get simulation runs
    const simulationStats = await db.SimulationRun.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', '*'), 'count'],
        [db.sequelize.fn('AVG', db.sequelize.literal('EXTRACT(EPOCH FROM ("completedAt" - "startedAt"))')), 'avgDurationSeconds']
      ],
      where: {
        runType: 'analytics'
      },
      group: ['status'],
      raw: true
    });
    
    // Get current viral posts
    const viralPosts = await db.Post.findAll({
      attributes: ['id', 'title', 'viewCount', 'likeCount', 'createdAt'],
      where: {
        viewCount: {
          [Op.gt]: 10000 // Posts with more than 10k views
        }
      },
      order: [['viewCount', 'DESC']],
      limit: 10
    });
    
    res.json({
      success: true,
      data: {
        simulationStats,
        viralPosts
      }
    });
  } catch (error) {
    logger.error('Failed to get simulation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve simulation statistics'
    });
  }
});

// Get system performance metrics
router.get('/performance', async (req, res) => {
  try {
    // Get recent simulation runs
    const recentRuns = await db.SimulationRun.findAll({
      attributes: ['id', 'runType', 'status', 'startedAt', 'completedAt', 'error'],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    // Calculate success rate
    const successCount = recentRuns.filter(run => run.status === 'completed').length;
    const failureCount = recentRuns.filter(run => run.status === 'failed').length;
    const successRate = recentRuns.length > 0 ? (successCount / recentRuns.length) * 100 : 0;
    
    // Get database stats
    const dbStats = await db.sequelize.query(`
      SELECT 
        pg_database_size(current_database()) as database_size,
        (SELECT count(*) FROM users WHERE "isBot" = true) as bot_user_count,
        (SELECT count(*) FROM posts) as total_posts,
        (SELECT count(*) FROM views) as total_views,
        (SELECT count(*) FROM likes) as total_likes
    `, { type: db.sequelize.QueryTypes.SELECT });
    
    res.json({
      success: true,
      data: {
        performance: {
          successRate: successRate.toFixed(2),
          recentRuns: {
            total: recentRuns.length,
            completed: successCount,
            failed: failureCount,
            running: recentRuns.filter(run => run.status === 'running').length
          }
        },
        database: dbStats[0],
        uptime: process.uptime()
      }
    });
  } catch (error) {
    logger.error('Failed to get performance stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance statistics'
    });
  }
});

// Get real-time analytics data
router.get('/realtime', async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    // Get recent views
    const recentViews = await db.View.count({
      where: {
        createdAt: {
          [Op.gte]: fiveMinutesAgo
        }
      }
    });
    
    // Get recent likes
    const recentLikes = await db.Like.count({
      where: {
        createdAt: {
          [Op.gte]: fiveMinutesAgo
        }
      }
    });
    
    // Get recent posts
    const recentPosts = await db.Post.count({
      include: [{
        model: db.User,
        as: 'user',
        where: { isBot: true }
      }],
      where: {
        createdAt: {
          [Op.gte]: fiveMinutesAgo
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        timestamp: new Date(),
        last5Minutes: {
          views: recentViews,
          likes: recentLikes,
          posts: recentPosts
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get realtime stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve realtime statistics'
    });
  }
});

module.exports = router;