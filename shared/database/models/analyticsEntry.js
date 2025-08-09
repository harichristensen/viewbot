module.exports = (sequelize, DataTypes) => {
  const AnalyticsEntry = sequelize.define('AnalyticsEntry', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    likeCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    commentCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    shareCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    engagementRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Calculated engagement rate'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false,
      comment: 'Additional metrics and data'
    }
  }, {
    tableName: 'analytics_entries',
    timestamps: false,
    indexes: [
      { fields: ['postId'] },
      { fields: ['timestamp'] },
      { fields: ['postId', 'timestamp'] }
    ]
  });

  AnalyticsEntry.associate = function(models) {
    AnalyticsEntry.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return AnalyticsEntry;
};