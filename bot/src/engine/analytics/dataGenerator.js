const db = require('../../../../shared/database/models');
const appConfig = require('../../config/config');

/**
 * Generates synthetic data for viral simulations
 */
class DataGenerator {
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
    const botUsers = shuffledUsers.slice(0, Math.min(count, appConfig.analytics.maxBotUsersPerBatch));

    const viewRecords = [];
    const userIds = botUsers.map(u => u.id);
    
    for (let i = 0; i < count; i++) {
      const userId = userIds[i % userIds.length]; // Cycle through users if needed
      
      viewRecords.push({
        postId,
        userId,
        ipAddress: this.generateRandomIP(),
        userAgent: this.generateRandomUserAgent(),
        duration: Math.floor(Math.random() * (appConfig.analytics.maxViewDuration - appConfig.analytics.minViewDuration)) + appConfig.analytics.minViewDuration,
        createdAt: new Date()
      });
    }

    // Bulk create views in batches
    const batchSize = appConfig.analytics.bulkInsertBatchSize;
    for (let i = 0; i < viewRecords.length; i += batchSize) {
      const batch = viewRecords.slice(i, i + batchSize);
      await db.View.bulkCreate(batch, { transaction });
    }
  }

  /**
   * Generate synthetic like records
   */
  async generateSyntheticLikes(postId, count, existingLikedUserIds, transaction) {
    // Get all available bot users and shuffle them safely
    const allAvailableBotUsers = await db.User.findAll({
      where: {
        isBot: true,
        id: { [db.Sequelize.Op.notIn]: Array.from(existingLikedUserIds) }
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

    return likeRecords.length;
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

  /**
   * Create analytics entry for tracking
   */
  async createAnalyticsEntry(data, transaction) {
    const {
      postId,
      viewCount,
      likeCount,
      commentCount,
      shareCount,
      engagementRate,
      metadata
    } = data;

    return await db.AnalyticsEntry.create({
      postId,
      timestamp: new Date(),
      viewCount,
      likeCount,
      commentCount,
      shareCount: shareCount || 0,
      engagementRate,
      metadata
    }, { transaction });
  }
}

module.exports = DataGenerator;