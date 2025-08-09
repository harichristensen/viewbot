const cron = require('node-cron');
const PostingService = require('./postingService');
const db = require('../../../../shared/database/models');
const logger = require('../../utils/logger');

class PostingScheduler {
  constructor() {
    this.postingService = new PostingService();
    this.scheduledJobs = new Map();
    this.isRunning = false;
  }

  /**
   * Initialize the scheduler with configurations
   */
  async initialize() {
    try {
      logger.info('Initializing posting scheduler...');
      
      // Load active posting configurations
      const configs = await db.BotConfig.findAll({
        where: {
          configType: 'posting',
          isActive: true
        }
      });

      logger.info(`Found ${configs.length} active posting configurations`);

      // Schedule jobs for each configuration
      for (const config of configs) {
        await this.scheduleJob(config);
      }

      this.isRunning = true;
      logger.info('✅ Posting scheduler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize posting scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule a job based on configuration
   */
  async scheduleJob(config) {
    try {
      const { id, name, config: jobConfig, schedule } = config;
      
      // Default schedule: every 5-10 minutes during active hours
      const cronPattern = schedule?.pattern || '*/7 * * * *';
      
      logger.info(`Scheduling job "${name}" (ID: ${id}) with pattern: ${cronPattern}`);

      const job = cron.schedule(cronPattern, async () => {
        await this.executePostingJob(config);
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'UTC'
      });

      this.scheduledJobs.set(id, {
        job,
        config,
        lastRun: null,
        runCount: 0
      });

      // Update next run time
      await db.BotConfig.update(
        { nextRunAt: this.getNextRunTime(cronPattern) },
        { where: { id } }
      );

    } catch (error) {
      logger.error(`Failed to schedule job ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Execute a posting job
   */
  async executePostingJob(config) {
    const { id, name, config: jobConfig } = config;
    const jobData = this.scheduledJobs.get(id);

    if (!jobData) {
      logger.warn(`Job data not found for config ${id}`);
      return;
    }

    logger.info(`🚀 Executing posting job: ${name}`);

    // Create simulation run record
    const simulationRun = await db.SimulationRun.create({
      configId: id,
      runType: 'posting',
      status: 'running',
      startedAt: new Date()
    });

    try {
      // Apply job configuration
      const postingConfig = {
        postingProbability: jobConfig.postingProbability || 0.7,
        minPostsPerDay: jobConfig.minPostsPerDay || 5,
        maxPostsPerDay: jobConfig.maxPostsPerDay || 20,
        activeHours: jobConfig.activeHours || { start: 6, end: 23 },
        mediaTypes: jobConfig.mediaTypes || ['video', 'image']
      };

      // Check if within active hours
      const currentHour = new Date().getHours();
      if (!this.isWithinActiveHours(currentHour, postingConfig.activeHours)) {
        logger.info(`Outside active hours (${postingConfig.activeHours.start}-${postingConfig.activeHours.end}), skipping...`);
        
        await simulationRun.update({
          status: 'completed',
          completedAt: new Date(),
          results: {
            skipped: true,
            reason: 'outside_active_hours'
          }
        });
        return;
      }

      // Check daily post limit
      const todayPostCount = await this.getTodayPostCount();
      if (todayPostCount >= postingConfig.maxPostsPerDay) {
        logger.info(`Daily post limit reached (${todayPostCount}/${postingConfig.maxPostsPerDay}), skipping...`);
        
        await simulationRun.update({
          status: 'completed',
          completedAt: new Date(),
          results: {
            skipped: true,
            reason: 'daily_limit_reached',
            todayPostCount
          }
        });
        return;
      }

      // Execute posting with human behavior
      const result = await this.postingService.executeWithHumanBehavior({
        postingProbability: postingConfig.postingProbability,
        timeOfDay: currentHour
      });

      // Update job data
      jobData.lastRun = new Date();
      jobData.runCount++;

      // Update config last run time
      await db.BotConfig.update(
        { 
          lastRunAt: new Date(),
          nextRunAt: this.getNextRunTime('*/7 * * * *')
        },
        { where: { id } }
      );

      // Update simulation run
      await simulationRun.update({
        status: result.success ? 'completed' : 'failed',
        completedAt: new Date(),
        results: result,
        error: result.error
      });

      if (result.success && !result.skipped) {
        logger.info(`✅ Posting job completed successfully: ${result.post?.id || 'N/A'}`);
      }

    } catch (error) {
      logger.error(`Failed to execute posting job ${name}:`, error);
      
      await simulationRun.update({
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      });
    }
  }

  /**
   * Check if current time is within active hours
   */
  isWithinActiveHours(currentHour, activeHours) {
    const { start, end } = activeHours;
    
    if (start <= end) {
      // Normal case: e.g., 6 AM to 11 PM
      return currentHour >= start && currentHour < end;
    } else {
      // Overnight case: e.g., 10 PM to 2 AM
      return currentHour >= start || currentHour < end;
    }
  }

  /**
   * Get count of posts created today
   */
  async getTodayPostCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await db.Post.count({
      include: [{
        model: db.User,
        as: 'user',
        where: { isBot: true },
        required: true
      }],
      where: {
        createdAt: {
          [db.Sequelize.Op.gte]: today
        }
      }
    });

    return count;
  }

  /**
   * Get next run time for a cron pattern
   */
  getNextRunTime(pattern) {
    const interval = cron.schedule(pattern, () => {}, { scheduled: false });
    const nextRun = new Date();
    
    // Simple approximation - add the interval
    const parts = pattern.split(' ');
    if (parts[0].startsWith('*/')) {
      const minutes = parseInt(parts[0].substring(2));
      nextRun.setMinutes(nextRun.getMinutes() + minutes);
    }
    
    return nextRun;
  }

  /**
   * Stop a specific job
   */
  stopJob(configId) {
    const jobData = this.scheduledJobs.get(configId);
    if (jobData) {
      jobData.job.stop();
      this.scheduledJobs.delete(configId);
      logger.info(`Stopped job for config ${configId}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll() {
    logger.info('Stopping all scheduled jobs...');
    
    for (const [configId, jobData] of this.scheduledJobs) {
      jobData.job.stop();
    }
    
    this.scheduledJobs.clear();
    this.isRunning = false;
    
    logger.info('All jobs stopped');
  }

  /**
   * Reload configurations and reschedule jobs
   */
  async reload() {
    logger.info('Reloading posting scheduler...');
    
    // Stop all current jobs
    this.stopAll();
    
    // Reinitialize
    await this.initialize();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    const jobs = [];
    
    for (const [configId, jobData] of this.scheduledJobs) {
      jobs.push({
        configId,
        name: jobData.config.name,
        lastRun: jobData.lastRun,
        runCount: jobData.runCount,
        isActive: jobData.config.isActive
      });
    }
    
    return {
      isRunning: this.isRunning,
      jobCount: this.scheduledJobs.size,
      jobs
    };
  }
}

// Create singleton instance
let scheduler = null;

module.exports = {
  getScheduler: () => {
    if (!scheduler) {
      scheduler = new PostingScheduler();
    }
    return scheduler;
  },
  PostingScheduler
};