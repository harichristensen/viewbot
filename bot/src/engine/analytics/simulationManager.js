const logger = require('../../utils/logger');

/**
 * Manages viral growth simulations
 */
class SimulationManager {
  constructor() {
    this.activeSimulations = new Map();
  }

  /**
   * Start a viral growth simulation for a specific media
   */
  async startSimulation(config) {
    const {
      targetMediaId,
      maxViews,
      maxLikes,
      likeRatio,
      growthDurationHours,
      growthCurve,
      initialViews = 0,
      initialLikes = 0
    } = config;

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
      initialViews,
      initialLikes
    };

    this.activeSimulations.set(targetMediaId, simulation);

    return {
      success: true,
      simulation,
      message: `Viral simulation started for media ${targetMediaId}`
    };
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
   * Get simulation by media ID
   */
  getSimulation(mediaId) {
    return this.activeSimulations.get(mediaId);
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
    
    for (const [mediaId, _] of this.activeSimulations) {
      simulations.push(this.getSimulationStatus(mediaId));
    }
    
    return simulations;
  }

  /**
   * Check if simulation is complete
   */
  isSimulationComplete(simulation) {
    const elapsedMs = Date.now() - simulation.startTime.getTime();
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    return elapsedHours >= simulation.growthDurationHours;
  }

  /**
   * Get all active simulation IDs
   */
  getActiveSimulationIds() {
    return Array.from(this.activeSimulations.keys());
  }
}

module.exports = SimulationManager;