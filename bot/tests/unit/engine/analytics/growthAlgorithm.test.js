const {
  calculateSigmoidGrowth,
  calculateEngagementMetrics,
  shuffleArray
} = require('../../../../src/engine/analytics/growthAlgorithm');

describe('Growth Algorithm Tests', () => {
  describe('calculateSigmoidGrowth', () => {
    it('should return 0 at time 0', () => {
      const result = calculateSigmoidGrowth(0, 72, 10000);
      expect(result).toBeCloseTo(0, 0);
    });

    it('should return approximately half the max value at midpoint', () => {
      const maxValue = 10000;
      const duration = 72;
      const midpoint = duration / 2;
      const result = calculateSigmoidGrowth(midpoint, duration, maxValue);
      
      // Should be close to 50% of max value (allowing for some variance)
      expect(result).toBeGreaterThan(maxValue * 0.45);
      expect(result).toBeLessThan(maxValue * 0.55);
    });

    it('should approach max value at the end of duration', () => {
      const maxValue = 10000;
      const duration = 72;
      const result = calculateSigmoidGrowth(duration, duration, maxValue);
      
      // Should be very close to max value
      expect(result).toBeGreaterThan(maxValue * 0.95);
    });

    it('should produce monotonically increasing values', () => {
      const maxValue = 10000;
      const duration = 72;
      let previousValue = 0;
      
      for (let hour = 0; hour <= duration; hour += 1) {
        const currentValue = calculateSigmoidGrowth(hour, duration, maxValue);
        expect(currentValue).toBeGreaterThanOrEqual(previousValue);
        previousValue = currentValue;
      }
    });
  });

  describe('calculateEngagementMetrics', () => {
    it('should return 0 when views is 0', () => {
      const result = calculateEngagementMetrics(0, 10, 5, 2);
      expect(result).toBe(0);
    });

    it('should calculate weighted engagement correctly', () => {
      const views = 1000;
      const likes = 50;    // 50 * 1 = 50
      const comments = 10; // 10 * 2 = 20
      const shares = 5;    // 5 * 3 = 15
      // Total: 85, Rate: 85/1000 * 100 = 8.5%
      
      const result = calculateEngagementMetrics(views, likes, comments, shares);
      expect(result).toBeCloseTo(8.5, 1);
    });

    it('should cap engagement rate at 100%', () => {
      const views = 10;
      const likes = 100;
      const comments = 50;
      const shares = 50;
      
      const result = calculateEngagementMetrics(views, likes, comments, shares);
      expect(result).toBe(100);
    });
  });
});