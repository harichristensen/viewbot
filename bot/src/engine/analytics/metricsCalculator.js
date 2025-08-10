const { calculateSigmoidGrowth, calculateEngagementMetrics } = require('./growthAlgorithm');
const appConfig = require('../../config/config');

/**
 * Calculates metrics for viral growth simulations
 */
class MetricsCalculator {
  /**
   * Calculate target metrics based on growth curve
   */
  calculateTargetMetrics(simulation, elapsedHours) {
    const {
      maxViews,
      maxLikes,
      likeRatio,
      growthDurationHours,
      growthCurve,
      initialViews,
      initialLikes
    } = simulation;

    let targetViews, targetLikes;

    if (growthCurve === 'sigmoid') {
      // Use sigmoid (S-curve) growth
      targetViews = this.calculateSigmoidViews(
        elapsedHours,
        growthDurationHours,
        maxViews,
        initialViews
      );
    } else if (growthCurve === 'exponential') {
      // Exponential growth
      targetViews = this.calculateExponentialViews(
        elapsedHours,
        growthDurationHours,
        maxViews,
        initialViews
      );
    } else {
      // Linear growth (default)
      targetViews = this.calculateLinearViews(
        elapsedHours,
        growthDurationHours,
        maxViews,
        initialViews
      );
    }

    // Calculate likes based on view count and ratio
    const potentialLikes = Math.floor(targetViews * likeRatio);
    targetLikes = Math.min(potentialLikes, maxLikes, targetViews);

    // Add some randomness for realism
    const viewVariance = Math.random() * appConfig.analytics.viewVarianceRange - 
                        (appConfig.analytics.viewVarianceRange / 2);
    const likeVariance = Math.random() * appConfig.analytics.likeVarianceRange - 
                        (appConfig.analytics.likeVarianceRange / 2);
    
    targetViews = Math.floor(targetViews * (1 + viewVariance));
    targetLikes = Math.floor(targetLikes * (1 + likeVariance));

    return {
      targetViews,
      targetLikes
    };
  }

  /**
   * Calculate sigmoid growth for views
   */
  calculateSigmoidViews(elapsedHours, growthDurationHours, maxViews, initialViews) {
    const viewGrowth = maxViews - initialViews;
    const growthProgress = calculateSigmoidGrowth(
      elapsedHours,
      growthDurationHours,
      viewGrowth
    );
    return Math.floor(initialViews + growthProgress);
  }

  /**
   * Calculate exponential growth for views
   */
  calculateExponentialViews(elapsedHours, growthDurationHours, maxViews, initialViews) {
    const growthRate = Math.log(maxViews / initialViews) / growthDurationHours;
    return Math.floor(initialViews * Math.exp(growthRate * elapsedHours));
  }

  /**
   * Calculate linear growth for views
   */
  calculateLinearViews(elapsedHours, growthDurationHours, maxViews, initialViews) {
    const viewsPerHour = (maxViews - initialViews) / growthDurationHours;
    return Math.floor(initialViews + (viewsPerHour * elapsedHours));
  }

  /**
   * Adjust metrics to ensure they follow business rules
   */
  adjustMetrics(targetViews, targetLikes, currentViews, currentLikes) {
    // Ensure we don't decrease counts
    const finalViews = Math.max(targetViews, currentViews);
    let finalLikes = Math.max(targetLikes, currentLikes);
    
    // Likes can't exceed views
    finalLikes = Math.min(finalLikes, finalViews);

    return {
      finalViews,
      finalLikes,
      hasChanges: finalViews > currentViews || finalLikes > currentLikes
    };
  }

  /**
   * Calculate elapsed time from simulation start
   */
  calculateElapsedTime(startTime) {
    const elapsedMs = Date.now() - startTime.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    return elapsedHours;
  }

  /**
   * Calculate engagement metrics
   */
  calculateEngagement(viewCount, likeCount, commentCount, shareCount) {
    return calculateEngagementMetrics(viewCount, likeCount, commentCount, shareCount);
  }

  /**
   * Calculate simulation progress percentage
   */
  calculateProgress(elapsedHours, growthDurationHours) {
    return ((elapsedHours / growthDurationHours) * 100).toFixed(1) + '%';
  }
}

module.exports = MetricsCalculator;