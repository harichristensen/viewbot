module.exports = (sequelize, DataTypes) => {
  const Like = sequelize.define('Like', {
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
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'posts',
        key: 'id'
      }
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'likes',
    timestamps: false,
    indexes: [
      { 
        unique: true,
        fields: ['userId', 'postId'] 
      },
      { fields: ['postId'] },
      { fields: ['createdAt'] }
    ]
  });

  Like.associate = function(models) {
    Like.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Like.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return Like;
};