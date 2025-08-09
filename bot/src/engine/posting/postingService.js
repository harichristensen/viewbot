const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const { faker } = require('@faker-js/faker');
const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');
const { getRandomBotUser, authenticateUser } = require('../../utils/auth');
const { selectRandomMedia, getMediaMetadata } = require('../../utils/media');

class PostingService {
  constructor(config = {}) {
    this.config = {
      apiBaseUrl: process.env.MAIN_APP_API || 'http://app:3000/api',
      mediaDir: process.env.BOT_MEDIA_DIR || '/app/media',
      minioEndpoint: process.env.MINIO_ENDPOINT || 'minio:9000',
      botUserPassword: process.env.BOT_USER_PASSWORD || 'default_bot_password',
      ...config
    };
  }

  /**
   * Generate a catchy title for the post
   */
  generateTitle() {
    const templates = [
      () => `Check out this ${faker.word.adjective()} content!`,
      () => `${faker.word.adjective().charAt(0).toUpperCase() + faker.word.adjective().slice(1)} moments captured`,
      () => `You won't believe this ${faker.word.noun()}!`,
      () => `${faker.word.verb()}ing through life like...`,
      () => `When ${faker.word.noun()} meets ${faker.word.noun()}`,
      () => `This is ${faker.word.adjective()}! 🔥`,
      () => `${faker.date.weekday()} vibes ✨`,
      () => `POV: ${faker.lorem.sentence(4)}`,
      () => `${faker.word.adjective()} ${faker.date.month()} energy`,
      () => `Just ${faker.word.verb()}ing around`
    ];

    const template = faker.helpers.arrayElement(templates);
    return template();
  }

  /**
   * Generate a description for the post
   */
  generateDescription() {
    const hashtags = () => {
      const tags = [];
      const tagCount = faker.number.int({ min: 3, max: 8 });
      const popularTags = [
        'viral', 'trending', 'fyp', 'foryou', 'explore',
        'instagood', 'love', 'photooftheday', 'beautiful',
        'happy', 'cute', 'tbt', 'like4like', 'followme',
        'picoftheday', 'follow', 'me', 'selfie', 'summer',
        'art', 'instadaily', 'friends', 'repost', 'nature',
        'girl', 'fun', 'style', 'smile', 'food'
      ];

      for (let i = 0; i < tagCount; i++) {
        tags.push(`#${faker.helpers.arrayElement(popularTags)}`);
      }
      return tags.join(' ');
    };

    const templates = [
      () => `${faker.lorem.sentence()} ${hashtags()}`,
      () => `${faker.lorem.paragraph(2)}\n\n${hashtags()}`,
      () => `${faker.company.catchPhrase()} 💯\n\n${hashtags()}`,
      () => `Mood: ${faker.word.adjective()} 😊\n\n${faker.lorem.sentence()}\n\n${hashtags()}`,
      () => `${faker.quote.quote()}\n\n${hashtags()}`
    ];

    const template = faker.helpers.arrayElement(templates);
    return template();
  }

  /**
   * Get pre-signed upload URL from the API
   */
  async getUploadUrl(authToken, filename, contentType) {
    try {
      const response = await axios.post(
        `${this.config.apiBaseUrl}/media/upload-url`,
        {
          filename,
          contentType
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get upload URL:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Upload media file to MinIO
   */
  async uploadMedia(uploadUrl, filePath, contentType) {
    try {
      const fileData = await fs.readFile(filePath);
      
      await axios.put(uploadUrl, fileData, {
        headers: {
          'Content-Type': contentType
        }
      });

      logger.info(`Media uploaded successfully: ${path.basename(filePath)}`);
    } catch (error) {
      logger.error('Failed to upload media:', error.message);
      throw error;
    }
  }

  /**
   * Create a post via the API
   */
  async createPost(authToken, postData) {
    try {
      const response = await axios.post(
        `${this.config.apiBaseUrl}/posts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to create post:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Execute a single posting action
   */
  async executePosting() {
    const startTime = Date.now();
    const result = {
      success: false,
      botUser: null,
      post: null,
      error: null,
      duration: 0
    };

    try {
      // Step 1: Select a random bot user
      logger.info('Selecting random bot user...');
      const botUser = await getRandomBotUser();
      result.botUser = { id: botUser.id, username: botUser.username };
      logger.info(`Selected bot user: ${botUser.username}`);

      // Step 2: Authenticate
      logger.info('Authenticating bot user...');
      const authToken = await authenticateUser(botUser.email, this.config.botUserPassword);
      logger.info('Authentication successful');

      // Step 3: Select random media
      logger.info('Selecting random media...');
      const mediaFile = await selectRandomMedia(this.config.mediaDir);
      const mediaMetadata = await getMediaMetadata(mediaFile.path);
      logger.info(`Selected media: ${mediaFile.filename} (${mediaMetadata.type})`);

      // Step 4: Get upload URL
      logger.info('Getting upload URL...');
      const { uploadUrl, mediaUrl } = await this.getUploadUrl(
        authToken,
        mediaFile.filename,
        mediaMetadata.contentType
      );

      // Step 5: Upload media
      logger.info('Uploading media...');
      await this.uploadMedia(uploadUrl, mediaFile.path, mediaMetadata.contentType);

      // Step 6: Generate post content
      const title = this.generateTitle();
      const description = this.generateDescription();
      const tags = description.match(/#\w+/g) || [];

      logger.info(`Generated title: ${title}`);
      logger.info(`Generated ${tags.length} tags`);

      // Step 7: Create post
      logger.info('Creating post...');
      const postData = {
        title,
        description,
        mediaType: mediaMetadata.type,
        mediaUrl,
        thumbnailUrl: mediaMetadata.thumbnailUrl || mediaUrl,
        duration: mediaMetadata.duration,
        tags: tags.map(tag => tag.substring(1)), // Remove # from tags
        status: 'published',
        publishedAt: new Date()
      };

      const post = await this.createPost(authToken, postData);
      result.post = post;
      result.success = true;

      logger.info(`✅ Post created successfully: ${post.id} by ${botUser.username}`);

      // Update bot user's last activity
      await db.User.update(
        { lastLoginAt: new Date() },
        { where: { id: botUser.id } }
      );

    } catch (error) {
      result.error = error.message;
      logger.error('❌ Posting failed:', error);
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Execute posting with human-like decision making
   */
  async executeWithHumanBehavior(config = {}) {
    const {
      postingProbability = 0.7,
      timeOfDay = new Date().getHours()
    } = config;

    // Time-based activity weights (0-1 scale)
    const activityWeights = {
      0: 0.1,   // Midnight
      1: 0.05,
      2: 0.05,
      3: 0.05,
      4: 0.05,
      5: 0.1,
      6: 0.3,   // Early morning
      7: 0.5,
      8: 0.7,   // Morning
      9: 0.8,
      10: 0.8,
      11: 0.9,
      12: 0.95, // Noon
      13: 0.9,
      14: 0.8,
      15: 0.7,
      16: 0.8,
      17: 0.9,  // Evening
      18: 0.95,
      19: 0.95,
      20: 0.9,  // Night
      21: 0.8,
      22: 0.6,
      23: 0.3
    };

    const timeWeight = activityWeights[timeOfDay] || 0.5;
    const adjustedProbability = postingProbability * timeWeight;

    // Random decision whether to post
    if (Math.random() > adjustedProbability) {
      logger.info(`Skipping post (probability: ${(adjustedProbability * 100).toFixed(1)}%)`);
      return {
        success: true,
        skipped: true,
        reason: 'probability_check',
        probability: adjustedProbability
      };
    }

    // Add random delay to simulate thinking/typing time
    const delay = faker.number.int({ min: 3000, max: 15000 });
    logger.info(`Waiting ${delay}ms to simulate human behavior...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return await this.executePosting();
  }
}

module.exports = PostingService;