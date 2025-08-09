module.exports = (sequelize, DataTypes) => {
  const SimulationRun = sequelize.define('SimulationRun', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    configId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bot_configs',
        key: 'id'
      }
    },
    runType: {
      type: DataTypes.ENUM('posting', 'analytics', 'test'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    results: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
      comment: 'Execution results and metrics'
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if failed'
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
    tableName: 'simulation_runs',
    timestamps: true,
    indexes: [
      { fields: ['configId'] },
      { fields: ['runType'] },
      { fields: ['status'] },
      { fields: ['startedAt'] },
      { fields: ['createdAt'] }
    ]
  });

  SimulationRun.associate = function(models) {
    SimulationRun.belongsTo(models.BotConfig, {
      foreignKey: 'configId',
      as: 'config'
    });
  };

  return SimulationRun;
};