const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../../../shared/database/models');
const logger = require('./logger');

class AuthUtils {
  constructor() {
    this.apiBaseUrl = process.env.MAIN_APP_API || 'http://app:3000/api';
    this.tokenCache = new Map();
  }

  /**
   * Get a random bot user from the database
   */
  async getRandomBotUser() {
    try {
      const botUsers = await db.User.findAll({
        where: {
          isBot: true,
          isActive: true
        },
        attributes: ['id', 'username', 'email', 'displayName']
      });

      if (botUsers.length === 0) {
        throw new Error('No bot users found. Please run the seeding script first.');
      }

      const randomIndex = Math.floor(Math.random() * botUsers.length);
      return botUsers[randomIndex];
    } catch (error) {
      logger.error('Failed to get random bot user:', error);
      throw error;
    }
  }

  /**
   * Authenticate a user and get JWT token
   */
  async authenticateUser(email, password) {
    try {
      // Check cache first
      const cachedToken = this.tokenCache.get(email);
      if (cachedToken && this.isTokenValid(cachedToken)) {
        logger.debug(`Using cached token for ${email}`);
        return cachedToken;
      }

      // Make login request
      const response = await axios.post(`${this.apiBaseUrl}/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;
      
      // Cache the token
      this.tokenCache.set(email, token);
      
      logger.info(`Authenticated user: ${user.username}`);
      return token;
    } catch (error) {
      logger.error('Authentication failed:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check if a JWT token is still valid
   */
  isTokenValid(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return false;
      }
      
      // Check if token expires in the next 5 minutes
      const expiresAt = decoded.exp * 1000;
      const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
      
      return expiresAt > fiveMinutesFromNow;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear cached tokens
   */
  clearTokenCache() {
    this.tokenCache.clear();
  }

  /**
   * Get bot users by activity status
   */
  async getBotUsersByActivity(isActive = true) {
    try {
      const users = await db.User.findAll({
        where: {
          isBot: true,
          isActive
        },
        attributes: ['id', 'username', 'email', 'lastLoginAt'],
        order: [['lastLoginAt', 'DESC']]
      });

      return users;
    } catch (error) {
      logger.error('Failed to get bot users by activity:', error);
      throw error;
    }
  }

  /**
   * Update bot user's last activity
   */
  async updateBotActivity(userId) {
    try {
      await db.User.update(
        { lastLoginAt: new Date() },
        { where: { id: userId, isBot: true } }
      );
    } catch (error) {
      logger.error(`Failed to update bot activity for user ${userId}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const authUtils = new AuthUtils();

// Export individual functions for easier use
module.exports = {
  getRandomBotUser: () => authUtils.getRandomBotUser(),
  authenticateUser: (email, password) => authUtils.authenticateUser(email, password),
  isTokenValid: (token) => authUtils.isTokenValid(token),
  clearTokenCache: () => authUtils.clearTokenCache(),
  getBotUsersByActivity: (isActive) => authUtils.getBotUsersByActivity(isActive),
  updateBotActivity: (userId) => authUtils.updateBotActivity(userId)
};