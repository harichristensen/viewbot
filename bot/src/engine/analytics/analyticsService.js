const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');
const { calculateSigmoidGrowth, calculateEngagementMetrics } = require('./growthAlgorithm');

class AnalyticsService {
  constructor() {
    this.activeSimulations = new Map();
  }

  /**
   * Start a viral growth simulation for a specific media
   */
  async startViralSimulation(config) {
    const {
      targetMediaId,
      maxViews,
      maxLikes,
      likeRatio = 0.05,
      growthDurationHours = 72,
      growthCurve = 'sigmoid'
    } = config;

    try {
      // Validate target media exists
      const targetPost = await db.Post.findByPk(targetMediaId);
      if (!targetPost) {
        throw new Error(`Target media ${targetMediaId} not found`);
      }

      logger.info(`Starting viral simulation for media ${targetMediaId}`);
      logger.info(`Target: ${maxViews} views, ${maxLikes} likes over ${growthDurationHours} hours`);

      // Store simulation configuration
      const simulation = {
        targetMediaId,
        maxViews,
        maxLikes,
        likeRatio,
        growthDurationHours,
        growthCurve,
        startTime: new Date(),
        initialViews: targetPost.viewCount,
        initialLikes: targetPost.likeCount
      };

      this.activeSimulations.set(targetMediaId, simulation);

      return {
        success: true,
        simulation,
        message: `Viral simulation started for media ${targetMediaId}`
      };
    } catch (error) {
      logger.error('Failed to start viral simulation:', error);
      throw error;
    }
  }

  /**
   * Update analytics for active simulations
   */
  async updateSimulations() {
    const results = [];

    // Collect all media IDs for batch operations
    const mediaIds = Array.from(this.activeSimulations.keys());
    
    if (mediaIds.length === 0) {
      return results;
    }

    // Batch fetch posts to reduce queries
    const posts = await db.Post.findAll({
      where: {
        id: { [db.Sequelize.Op.in]: mediaIds }
      }
    });

    const postsMap = new Map(posts.map(p => [p.id, p]));

    for (const [mediaId, simulation] of this.activeSimulations) {
      try {
        const post = postsMap.get(mediaId);
        if (!post) {
          throw new Error(`Post ${mediaId} not found`);
        }

        const result = await this.updateSingleSimulation(mediaId, simulation, post);
        results.push(result);

        // Check if simulation is complete
        if (result.isComplete) {
          this.activeSimulations.delete(mediaId);
          logger.info(`Simulation completed for media ${mediaId}`);
        }
      } catch (error) {
        logger.error(`Failed to update simulation for media ${mediaId}:`, error);
        results.push({
          mediaId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Update a single simulation
   */
  async updateSingleSimulation(mediaId, simulation, preloadedPost = null) {
    const {
      maxViews,
      maxLikes,
      likeRatio,
      growthDurationHours,
      growthCurve,
      startTime,
      initialViews,
      initialLikes
    } = simulation;

    // Calculate elapsed time
    const elapsedMs = Date.now() - startTime.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    // Check if simulation is complete
    if (elapsedHours >= growthDurationHours) {
      return {
        mediaId,
        success: true,
        isComplete: true,
        message: 'Simulation duration reached'
      };
    }

    // Use preloaded post or fetch it
    const post = preloadedPost || await db.Post.findByPk(mediaId);
    if (!post) {
      throw new Error(`Post ${mediaId} not found`);
    }

    // Calculate target metrics based on growth curve
    let targetViews, targetLikes;

    if (growthCurve === 'sigmoid') {
      // Use sigmoid (S-curve) growth
      const viewGrowth = maxViews - initialViews;
      const growthProgress = calculateSigmoidGrowth(
        elapsedHours,
        growthDurationHours,
        viewGrowth
      );
      targetViews = Math.floor(initialViews + growthProgress);
    } else if (growthCurve === 'exponential') {
      // Exponential growth
      const growthRate = Math.log(maxViews / initialViews) / growthDurationHours;
      targetViews = Math.floor(initialViews * Math.exp(growthRate * elapsedHours));
    } else {
      // Linear growth (default)
      const viewsPerHour = (maxViews - initialViews) / growthDurationHours;
      targetViews = Math.floor(initialViews + (viewsPerHour * elapsedHours));
    }

    // Calculate likes based on view count and ratio
    const potentialLikes = Math.floor(targetViews * likeRatio);
    targetLikes = Math.min(potentialLikes, maxLikes, targetViews);

    // Add some randomness for realism
    const viewVariance = Math.random() * 0.1 - 0.05; // +/- 5%
    const likeVariance = Math.random() * 0.15 - 0.075; // +/- 7.5%
    
    targetViews = Math.floor(targetViews * (1 + viewVariance));
    targetLikes = Math.floor(targetLikes * (1 + likeVariance));

    // Ensure we don't decrease counts
    targetViews = Math.max(targetViews, post.viewCount);
    targetLikes = Math.max(targetLikes, post.likeCount);
    targetLikes = Math.min(targetLikes, targetViews); // Likes can't exceed views

    // Update the post if there are changes
    const hasChanges = targetViews > post.viewCount || targetLikes > post.likeCount;
    
    if (hasChanges) {
      // Start a transaction with isolation level
      const transaction = await db.sequelize.transaction({
        isolationLevel: db.Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
      });

      try {
        // Re-fetch the post with lock to prevent concurrent updates
        const lockedPost = await db.Post.findByPk(mediaId, {
          lock: true,
          transaction
        });

        if (!lockedPost) {
          throw new Error(`Post ${mediaId} not found during locked update`);
        }

        // Recalculate to ensure we have the latest values
        const finalViews = Math.max(targetViews, lockedPost.viewCount);
        const finalLikes = Math.max(targetLikes, lockedPost.likeCount);
        const finalLikesAdjusted = Math.min(finalLikes, finalViews);

        // Update post counts
        await lockedPost.update({
          viewCount: finalViews,
          likeCount: finalLikesAdjusted
        }, { transaction });

        // Create analytics entry
        const engagementRate = calculateEngagementMetrics(
          finalViews,
          finalLikesAdjusted,
          lockedPost.commentCount,
          lockedPost.shareCount || 0
        );

        await db.AnalyticsEntry.create({
          postId: mediaId,
          timestamp: new Date(),
          viewCount: finalViews,
          likeCount: finalLikesAdjusted,
          commentCount: lockedPost.commentCount,
          shareCount: lockedPost.shareCount || 0,
          engagementRate,
          metadata: {
            source: 'viral_simulation',
            growthCurve,
            elapsedHours: elapsedHours.toFixed(2),
            progress: ((elapsedHours / growthDurationHours) * 100).toFixed(1) + '%'
          }
        }, { transaction });

        // Generate synthetic view records for realism
        const newViews = finalViews - lockedPost.viewCount;
        if (newViews > 0) {
          await this.generateSyntheticViews(mediaId, newViews, transaction);
        }

        // Generate synthetic like records
        const newLikes = finalLikesAdjusted - lockedPost.likeCount;
        if (newLikes > 0) {
          await this.generateSyntheticLikes(mediaId, newLikes, transaction);
        }

        await transaction.commit();

        logger.info(`Updated media ${mediaId}: ${finalViews} views (+${newViews}), ${finalLikesAdjusted} likes (+${newLikes})`);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
      // Return updated values
      return {
        mediaId,
        success: true,
        isComplete: false,
        currentViews: finalViews,
        currentLikes: finalLikesAdjusted,
        progress: ((elapsedHours / growthDurationHours) * 100).toFixed(1) + '%',
        changes: {
          views: newViews,
          likes: newLikes
        }
      };
    }

    // No changes needed
    return {
      mediaId,
      success: true,
      isComplete: false,
      currentViews: targetViews,
      currentLikes: targetLikes,
      progress: ((elapsedHours / growthDurationHours) * 100).toFixed(1) + '%',
      changes: {
        views: 0,
        likes: 0
      }
    };
  }

  /**
   * Generate synthetic view records
   */
  async generateSyntheticViews(postId, count, transaction) {
    // Get all bot users and shuffle them safely
    const allBotUsers = await db.User.findAll({
      where: { isBot: true },
      attributes: ['id'],
      transaction
    });

    // Shuffle array using Fisher-Yates algorithm (safe and efficient)
    const shuffledUsers = this.shuffleArray([...allBotUsers]);
    const botUsers = shuffledUsers.slice(0, Math.min(count, 50));

    const viewRecords = [];
    const userIds = botUsers.map(u => u.id);
    
    for (let i = 0; i < count; i++) {
      const userId = userIds[i % userIds.length]; // Cycle through users if needed
      
      viewRecords.push({
        postId,
        userId,
        ipAddress: this.generateRandomIP(),
        userAgent: this.generateRandomUserAgent(),
        duration: Math.floor(Math.random() * 300) + 10, // 10-310 seconds
        createdAt: new Date()
      });
    }

    // Bulk create views in batches
    const batchSize = 100;
    for (let i = 0; i < viewRecords.length; i += batchSize) {
      const batch = viewRecords.slice(i, i + batchSize);
      await db.View.bulkCreate(batch, { transaction });
    }
  }

  /**
   * Generate synthetic like records
   */
  async generateSyntheticLikes(postId, count, transaction) {
    // Get bot users who haven't liked this post yet
    const existingLikes = await db.Like.findAll({
      where: { postId },
      attributes: ['userId'],
      transaction
    });

    const likedUserIds = new Set(existingLikes.map(l => l.userId));

    // Get all available bot users and shuffle them safely
    const allAvailableBotUsers = await db.User.findAll({
      where: {
        isBot: true,
        id: { [db.Sequelize.Op.notIn]: Array.from(likedUserIds) }
      },
      attributes: ['id'],
      transaction
    });

    // Shuffle and limit to required count
    const shuffledUsers = this.shuffleArray([...allAvailableBotUsers]);
    const availableBotUsers = shuffledUsers.slice(0, count);

    const likeRecords = availableBotUsers.map(user => ({
      userId: user.id,
      postId,
      createdAt: new Date()
    }));

    if (likeRecords.length > 0) {
      await db.Like.bulkCreate(likeRecords, { transaction });
    }
  }

  /**
   * Batch fetch existing likes for multiple posts to avoid N+1
   */
  async batchFetchExistingLikes(postIds, transaction) {
    const existingLikes = await db.Like.findAll({
      where: {
        postId: { [db.Sequelize.Op.in]: postIds }
      },
      attributes: ['postId', 'userId'],
      transaction
    });

    // Group by postId for easy lookup
    const likesByPost = {};
    postIds.forEach(id => likesByPost[id] = new Set());
    
    existingLikes.forEach(like => {
      likesByPost[like.postId].add(like.userId);
    });

    return likesByPost;
  }

  /**
   * Generate random IP address
   */
  generateRandomIP() {
    const octets = [];
    for (let i = 0; i < 4; i++) {
      octets.push(Math.floor(Math.random() * 256));
    }
    return octets.join('.');
  }

  /**
   * Generate random user agent
   */
  generateRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Android 11; Mobile; rv:89.0) Gecko/89.0 Firefox/89.0'
    ];
    
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Stop a viral simulation
   */
  stopSimulation(mediaId) {
    if (this.activeSimulations.has(mediaId)) {
      this.activeSimulations.delete(mediaId);
      logger.info(`Stopped simulation for media ${mediaId}`);
      return true;
    }
    return false;
  }

  /**
   * Get simulation status
   */
  getSimulationStatus(mediaId) {
    const simulation = this.activeSimulations.get(mediaId);
    if (!simulation) {
      return null;
    }

    const elapsedMs = Date.now() - simulation.startTime.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const progress = (elapsedHours / simulation.growthDurationHours) * 100;

    return {
      ...simulation,
      elapsedHours: elapsedHours.toFixed(2),
      progress: progress.toFixed(1) + '%',
      isActive: true
    };
  }

  /**
   * Get all active simulations
   */
  getAllSimulations() {
    const simulations = [];
    
    for (const [mediaId, simulation] of this.activeSimulations) {
      simulations.push(this.getSimulationStatus(mediaId));
    }
    
    return simulations;
  }

  /**
   * Safely shuffle an array using Fisher-Yates algorithm
   * @param {Array} array - Array to shuffle
   * @returns {Array} Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

module.exports = AnalyticsService;