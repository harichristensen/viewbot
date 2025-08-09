module.exports = {
  // Bot Configuration
  bot: {
    mediaDir: process.env.BOT_MEDIA_DIR || '/app/media',
    userPassword: process.env.BOT_USER_PASSWORD || 'default_bot_password',
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // API Configuration
  api: {
    mainAppUrl: process.env.MAIN_APP_API || 'http://app:3000/api',
    port: process.env.PORT || 3001,
    jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret'
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'viewbot',
    user: process.env.DB_USER || 'viewbot',
    password: process.env.DB_PASSWORD || 'password'
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379
  },

  // MinIO Configuration
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'minio:9000',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
  },

  // Posting Configuration
  posting: {
    defaultProbability: 0.7,
    minPostsPerDay: 5,
    maxPostsPerDay: 20,
    activeHours: {
      start: 6,
      end: 23
    },
    cronPattern: '*/7 * * * *', // Every 7 minutes
    humanDelay: {
      min: 3000,  // 3 seconds
      max: 15000  // 15 seconds
    }
  },

  // Analytics Configuration
  analytics: {
    defaultGrowthDurationHours: 72,
    defaultLikeRatio: 0.05,
    updateIntervalMinutes: 5,
    batchSize: 100,
    maxBotUsersPerUpdate: 50
  },

  // Scheduler Configuration
  scheduler: {
    timezone: process.env.TZ || 'UTC',
    jobCleanupIntervalHours: 24
  },

  // Viral Simulation Presets
  viralPresets: {
    slow: {
      growthDurationHours: 168, // 1 week
      growthCurve: 'logarithmic'
    },
    moderate: {
      growthDurationHours: 72, // 3 days
      growthCurve: 'sigmoid'
    },
    rapid: {
      growthDurationHours: 24, // 1 day
      growthCurve: 'exponential'
    }
  }
};