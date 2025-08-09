module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: [1, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    mediaType: {
      type: DataTypes.ENUM('video', 'image'),
      allowNull: false
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration in seconds for videos'
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'deleted'),
      defaultValue: 'published',
      allowNull: false
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    commentCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: false
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true
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
    tableName: 'posts',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['status'] },
      { fields: ['publishedAt'] },
      { fields: ['viewCount'] },
      { fields: ['likeCount'] },
      { fields: ['createdAt'] },
      { fields: ['tags'], using: 'GIN' }
    ]
  });

  Post.associate = function(models) {
    Post.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Post.hasMany(models.Like, {
      foreignKey: 'postId',
      as: 'likes'
    });
    Post.hasMany(models.View, {
      foreignKey: 'postId',
      as: 'views'
    });
    Post.hasMany(models.AnalyticsEntry, {
      foreignKey: 'postId',
      as: 'analytics'
    });
  };

  return Post;
};