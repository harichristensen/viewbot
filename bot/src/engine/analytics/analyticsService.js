const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');
const appConfig = require('../../config/config');
const SimulationManager = require('./simulationManager');
const MetricsCalculator = require('./metricsCalculator');
const DataGenerator = require('./dataGenerator');

/**
 * Main analytics service that orchestrates viral growth simulations
 */
class AnalyticsService {
  constructor() {
    this.simulationManager = new SimulationManager();
    this.metricsCalculator = new MetricsCalculator();
    this.dataGenerator = new DataGenerator();
  }

  /**
   * Start a viral growth simulation for a specific media
   */
  async startViralSimulation(config) {
    const {
      targetMediaId,
      maxViews,
      maxLikes,
      likeRatio = appConfig.analytics.defaultLikeRatio,
      growthDurationHours = appConfig.analytics.defaultGrowthDurationHours,
      growthCurve = appConfig.analytics.defaultGrowthCurve
    } = config;

    try {
      // Validate target media exists
      const targetPost = await db.Post.findByPk(targetMediaId);
      if (!targetPost) {
        throw new Error(`Target media ${targetMediaId} not found`);
      }

      // Start simulation with initial values
      return this.simulationManager.startSimulation({
        targetMediaId,
        maxViews,
        maxLikes: maxLikes || Math.floor(maxViews * appConfig.analytics.defaultLikeRatio),
        likeRatio,
        growthDurationHours,
        growthCurve,
        initialViews: targetPost.viewCount,
        initialLikes: targetPost.likeCount
      });
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

    // Get all active simulation IDs
    const mediaIds = this.simulationManager.getActiveSimulationIds();
    
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

    for (const mediaId of mediaIds) {
      try {
        const simulation = this.simulationManager.getSimulation(mediaId);
        const post = postsMap.get(mediaId);
        
        if (!post) {
          throw new Error(`Post ${mediaId} not found`);
        }

        const result = await this.updateSingleSimulation(mediaId, simulation, post);
        results.push(result);

        // Check if simulation is complete
        if (result.isComplete) {
          this.simulationManager.stopSimulation(mediaId);
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
    // Check if simulation is complete
    if (this.simulationManager.isSimulationComplete(simulation)) {
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

    // Calculate elapsed time and target metrics
    const elapsedHours = this.metricsCalculator.calculateElapsedTime(simulation.startTime);
    const { targetViews, targetLikes } = this.metricsCalculator.calculateTargetMetrics(
      simulation,
      elapsedHours
    );

    // Adjust metrics based on current values
    const { finalViews, finalLikes, hasChanges } = this.metricsCalculator.adjustMetrics(
      targetViews,
      targetLikes,
      post.viewCount,
      post.likeCount
    );

    if (hasChanges) {
      await this.applyMetricsUpdate(
        post,
        finalViews,
        finalLikes,
        simulation,
        elapsedHours
      );
    }

    // Calculate progress
    const progress = this.metricsCalculator.calculateProgress(
      elapsedHours,
      simulation.growthDurationHours
    );

    // Return result
    return {
      mediaId,
      success: true,
      isComplete: false,
      currentViews: finalViews,
      currentLikes: finalLikes,
      progress,
      changes: {
        views: hasChanges ? finalViews - post.viewCount : 0,
        likes: hasChanges ? finalLikes - post.likeCount : 0
      }
    };
  }

  /**
   * Apply metrics update with transaction
   */
  async applyMetricsUpdate(post, finalViews, finalLikes, simulation, elapsedHours) {
    // Start a transaction with isolation level
    const transaction = await db.sequelize.transaction({
      isolationLevel: db.Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
    });

    try {
      // Re-fetch the post with lock to prevent concurrent updates
      const lockedPost = await db.Post.findByPk(post.id, {
        lock: true,
        transaction
      });

      if (!lockedPost) {
        throw new Error(`Post ${post.id} not found during locked update`);
      }

      // Recalculate to ensure we have the latest values
      const adjustedViews = Math.max(finalViews, lockedPost.viewCount);
      const adjustedLikes = Math.max(finalLikes, lockedPost.likeCount);
      const finalLikesAdjusted = Math.min(adjustedLikes, adjustedViews);

      // Calculate new views and likes
      const newViews = adjustedViews - lockedPost.viewCount;
      const newLikes = finalLikesAdjusted - lockedPost.likeCount;

      // Update post counts
      await lockedPost.update({
        viewCount: adjustedViews,
        likeCount: finalLikesAdjusted
      }, { transaction });

      // Create analytics entry
      const engagementRate = this.metricsCalculator.calculateEngagement(
        adjustedViews,
        finalLikesAdjusted,
        lockedPost.commentCount,
        lockedPost.shareCount || 0
      );

      await this.dataGenerator.createAnalyticsEntry({
        postId: post.id,
        viewCount: adjustedViews,
        likeCount: finalLikesAdjusted,
        commentCount: lockedPost.commentCount,
        shareCount: lockedPost.shareCount || 0,
        engagementRate,
        metadata: {
          source: 'viral_simulation',
          growthCurve: simulation.growthCurve,
          elapsedHours: elapsedHours.toFixed(2),
          progress: this.metricsCalculator.calculateProgress(elapsedHours, simulation.growthDurationHours)
        }
      }, transaction);

      // Generate synthetic data
      if (newViews > 0) {
        await this.dataGenerator.generateSyntheticViews(post.id, newViews, transaction);
      }

      if (newLikes > 0) {
        // Fetch existing likes for this post
        const existingLikes = await db.Like.findAll({
          where: { postId: post.id },
          attributes: ['userId'],
          transaction
        });
        
        const likedUserIds = new Set(existingLikes.map(l => l.userId));
        await this.dataGenerator.generateSyntheticLikes(post.id, newLikes, likedUserIds, transaction);
      }

      await transaction.commit();

      logger.info(`Updated media ${post.id}: ${adjustedViews} views (+${newViews}), ${finalLikesAdjusted} likes (+${newLikes})`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Stop a viral simulation
   */
  stopSimulation(mediaId) {
    return this.simulationManager.stopSimulation(mediaId);
  }

  /**
   * Get simulation status
   */
  getSimulationStatus(mediaId) {
    return this.simulationManager.getSimulationStatus(mediaId);
  }

  /**
   * Get all active simulations
   */
  getAllSimulations() {
    return this.simulationManager.getAllSimulations();
  }
}

module.exports = AnalyticsService;