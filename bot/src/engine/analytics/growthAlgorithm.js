/**
 * Growth algorithms for viral simulation
 */

/**
 * Calculate sigmoid (S-curve) growth
 * This creates a realistic viral growth pattern: slow start, rapid growth, then plateau
 * 
 * @param {number} currentTime - Current time in hours since start
 * @param {number} totalDuration - Total duration in hours
 * @param {number} maxValue - Maximum value to reach
 * @returns {number} Current value based on sigmoid growth
 */
function calculateSigmoidGrowth(currentTime, totalDuration, maxValue) {
  // Steepness of the curve (higher = steeper)
  const k = 0.15;
  
  // Midpoint of growth (when 50% is reached)
  const midpoint = totalDuration / 2;
  
  // Sigmoid formula: L / (1 + e^(-k(t - t0)))
  // Where L = max value, k = steepness, t = current time, t0 = midpoint
  const exponential = Math.exp(-k * (currentTime - midpoint));
  const sigmoidValue = maxValue / (1 + exponential);
  
  return sigmoidValue;
}

/**
 * Calculate exponential growth
 * Creates very rapid initial growth that slows over time
 * 
 * @param {number} currentTime - Current time in hours
 * @param {number} totalDuration - Total duration in hours
 * @param {number} initialValue - Starting value
 * @param {number} maxValue - Maximum value to reach
 * @returns {number} Current value based on exponential growth
 */
function calculateExponentialGrowth(currentTime, totalDuration, initialValue, maxValue) {
  // Calculate growth rate to reach max value at end of duration
  const growthRate = Math.log(maxValue / initialValue) / totalDuration;
  
  // Exponential formula: initial * e^(rate * time)
  const value = initialValue * Math.exp(growthRate * currentTime);
  
  // Cap at max value
  return Math.min(value, maxValue);
}

/**
 * Calculate logarithmic growth
 * Creates rapid initial growth that quickly plateaus
 * 
 * @param {number} currentTime - Current time in hours
 * @param {number} totalDuration - Total duration in hours
 * @param {number} maxValue - Maximum value to reach
 * @returns {number} Current value based on logarithmic growth
 */
function calculateLogarithmicGrowth(currentTime, totalDuration, maxValue) {
  // Ensure we don't take log of 0
  const adjustedTime = currentTime + 1;
  const adjustedDuration = totalDuration + 1;
  
  // Logarithmic formula scaled to reach max at end
  const value = maxValue * (Math.log(adjustedTime) / Math.log(adjustedDuration));
  
  return Math.min(value, maxValue);
}

/**
 * Calculate engagement rate based on various metrics
 * 
 * @param {number} views - Total view count
 * @param {number} likes - Total like count
 * @param {number} comments - Total comment count
 * @param {number} shares - Total share count
 * @returns {number} Engagement rate as a percentage
 */
function calculateEngagementMetrics(views, likes, comments, shares) {
  if (views === 0) return 0;
  
  // Weight different interactions
  const weights = {
    like: 1,
    comment: 2,
    share: 3
  };
  
  const totalEngagement = 
    (likes * weights.like) + 
    (comments * weights.comment) + 
    (shares * weights.share);
  
  // Calculate as percentage of views
  const engagementRate = (totalEngagement / views) * 100;
  
  // Cap at 100%
  return Math.min(engagementRate, 100);
}

/**
 * Add random variations to make growth more realistic
 * 
 * @param {number} value - Base value
 * @param {number} variance - Variance percentage (0-1)
 * @returns {number} Value with random variance applied
 */
function addRealisticVariance(value, variance = 0.1) {
  // Generate random variance between -variance and +variance
  const randomVariance = (Math.random() * 2 - 1) * variance;
  return Math.floor(value * (1 + randomVariance));
}

/**
 * Calculate viral coefficient (K-factor)
 * Measures how many new users each existing user brings
 * 
 * @param {number} shares - Number of shares
 * @param {number} newViewsFromShares - New views generated from shares
 * @returns {number} Viral coefficient
 */
function calculateViralCoefficient(shares, newViewsFromShares) {
  if (shares === 0) return 0;
  return newViewsFromShares / shares;
}

/**
 * Simulate hourly growth pattern
 * Returns a multiplier based on typical user activity patterns
 * 
 * @param {number} hourOfDay - Hour of the day (0-23)
 * @returns {number} Activity multiplier (0-1)
 */
function getHourlyActivityMultiplier(hourOfDay) {
  // Activity patterns (normalized 0-1)
  const hourlyActivity = [
    0.3,  // 00:00 - Midnight
    0.2,  // 01:00
    0.15, // 02:00
    0.1,  // 03:00
    0.1,  // 04:00
    0.15, // 05:00
    0.3,  // 06:00 - Early morning
    0.5,  // 07:00
    0.7,  // 08:00 - Morning
    0.8,  // 09:00
    0.85, // 10:00
    0.9,  // 11:00
    0.95, // 12:00 - Noon peak
    0.9,  // 13:00
    0.85, // 14:00
    0.8,  // 15:00
    0.85, // 16:00
    0.9,  // 17:00 - Evening peak
    0.95, // 18:00
    1.0,  // 19:00 - Prime time
    0.95, // 20:00
    0.85, // 21:00
    0.7,  // 22:00
    0.5   // 23:00
  ];
  
  return hourlyActivity[hourOfDay] || 0.5;
}

/**
 * Calculate compound growth with multiple factors
 * 
 * @param {Object} params - Growth parameters
 * @returns {Object} Calculated growth metrics
 */
function calculateCompoundGrowth(params) {
  const {
    currentTime,
    totalDuration,
    baseGrowth,
    viralFactor = 1,
    seasonalFactor = 1,
    hourOfDay = 12
  } = params;
  
  // Get base growth using sigmoid
  const sigmoidGrowth = calculateSigmoidGrowth(currentTime, totalDuration, baseGrowth);
  
  // Apply multipliers
  const hourlyMultiplier = getHourlyActivityMultiplier(hourOfDay);
  const compoundGrowth = sigmoidGrowth * viralFactor * seasonalFactor * hourlyMultiplier;
  
  // Add realistic variance
  const finalGrowth = addRealisticVariance(compoundGrowth, 0.05);
  
  return {
    baseGrowth: sigmoidGrowth,
    hourlyMultiplier,
    viralFactor,
    seasonalFactor,
    finalGrowth
  };
}

module.exports = {
  calculateSigmoidGrowth,
  calculateExponentialGrowth,
  calculateLogarithmicGrowth,
  calculateEngagementMetrics,
  addRealisticVariance,
  calculateViralCoefficient,
  getHourlyActivityMultiplier,
  calculateCompoundGrowth
};