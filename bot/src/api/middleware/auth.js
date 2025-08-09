const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT tokens and ensures user has admin/bot management permissions
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user has admin permissions (you can customize this)
    if (!decoded.isAdmin && !decoded.permissions?.includes('bot_management')) {
      return res.status(403).json({
        error: 'Insufficient permissions to access bot management'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      isAdmin: decoded.isAdmin,
      permissions: decoded.permissions
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid authentication token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication token has expired'
      });
    }
    
    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed'
    });
  }
};

module.exports = authMiddleware;