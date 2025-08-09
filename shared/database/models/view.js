module.exports = (sequelize, DataTypes) => {
  const View = sequelize.define('View', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow anonymous views
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
    ipAddress: {
      type: DataTypes.STRING(45), // Support IPv6
      allowNull: true
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'View duration in seconds'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'views',
    timestamps: false,
    indexes: [
      { fields: ['postId'] },
      { fields: ['userId'] },
      { fields: ['createdAt'] },
      { 
        fields: ['postId', 'ipAddress', 'createdAt'],
        name: 'unique_view_per_ip_per_day'
      }
    ]
  });

  View.associate = function(models) {
    View.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    View.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return View;
};