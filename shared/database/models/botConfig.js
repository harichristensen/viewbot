module.exports = (sequelize, DataTypes) => {
  const BotConfig = sequelize.define('BotConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    configType: {
      type: DataTypes.ENUM('posting', 'analytics', 'behavior'),
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      comment: 'Configuration parameters as JSON'
    },
    schedule: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Cron schedule configuration'
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'bot_configs',
    timestamps: true,
    indexes: [
      { fields: ['configType'] },
      { fields: ['isActive'] },
      { fields: ['nextRunAt'] }
    ]
  });

  BotConfig.associate = function(models) {
    BotConfig.hasMany(models.SimulationRun, {
      foreignKey: 'configId',
      as: 'simulationRuns'
    });
  };

  // Example config structures
  BotConfig.CONFIG_TEMPLATES = {
    posting: {
      minPostsPerDay: 5,
      maxPostsPerDay: 20,
      activeHours: { start: 6, end: 23 },
      mediaTypes: ['video', 'image'],
      titlePatterns: ['Check out this!', 'Amazing content', 'You won\'t believe...'],
      descriptionLength: { min: 50, max: 200 }
    },
    analytics: {
      targetMediaId: null,
      maxViews: 100000,
      maxLikes: 5000,
      likeRatio: 0.05,
      growthDurationHours: 72,
      growthCurve: 'sigmoid', // sigmoid, exponential, linear
      updateIntervalMinutes: 5
    },
    behavior: {
      humanization: {
        typingSpeed: { min: 80, max: 120 }, // chars per minute
        clickDelay: { min: 500, max: 2000 }, // milliseconds
        scrollSpeed: 'natural',
        sessionDuration: { min: 300, max: 1800 } // seconds
      }
    }
  };

  return BotConfig;
};