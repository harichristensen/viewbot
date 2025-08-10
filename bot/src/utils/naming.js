/**
 * Naming convention transformation utilities
 * Provides consistent conversion between camelCase and snake_case
 */

/**
 * Convert camelCase to snake_case
 * @param {string} str - String to convert
 * @returns {string} snake_case string
 */
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 * @param {string} str - String to convert
 * @returns {string} camelCase string
 */
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Recursively transform object keys from camelCase to snake_case
 * @param {Object} obj - Object to transform
 * @returns {Object} Transformed object
 */
function transformKeysToSnake(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToSnake);
  }
  
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = transformKeysToSnake(obj[key]);
      return result;
    }, {});
  }
  
  return obj;
}

/**
 * Recursively transform object keys from snake_case to camelCase
 * @param {Object} obj - Object to transform
 * @returns {Object} Transformed object
 */
function transformKeysToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamel);
  }
  
  if (obj !== null && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformKeysToCamel(obj[key]);
      return result;
    }, {});
  }
  
  return obj;
}

/**
 * Express middleware to transform request body from snake_case to camelCase
 */
function snakeToCamelMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = transformKeysToCamel(req.body);
  }
  next();
}

/**
 * Express middleware to transform response from camelCase to snake_case
 */
function camelToSnakeMiddleware(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (data && typeof data === 'object') {
      data = transformKeysToSnake(data);
    }
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Transform database query results from snake_case to camelCase
 * Useful for Sequelize raw queries
 * @param {Array|Object} results - Query results
 * @returns {Array|Object} Transformed results
 */
function transformDatabaseResults(results) {
  return transformKeysToCamel(results);
}

/**
 * Transform data for database insertion from camelCase to snake_case
 * @param {Object} data - Data to insert
 * @returns {Object} Transformed data
 */
function transformForDatabase(data) {
  return transformKeysToSnake(data);
}

module.exports = {
  camelToSnake,
  snakeToCamel,
  transformKeysToSnake,
  transformKeysToCamel,
  snakeToCamelMiddleware,
  camelToSnakeMiddleware,
  transformDatabaseResults,
  transformForDatabase
};