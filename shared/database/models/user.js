module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    displayName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    isBot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    botCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    lastLoginAt: {
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
    tableName: 'users',
    timestamps: true,
    indexes: [
      { fields: ['username'] },
      { fields: ['email'] },
      { fields: ['isBot'] },
      { fields: ['createdAt'] }
    ]
  });

  User.associate = function(models) {
    User.hasMany(models.Post, {
      foreignKey: 'userId',
      as: 'posts'
    });
    User.hasMany(models.Like, {
      foreignKey: 'userId',
      as: 'likes'
    });
    User.hasMany(models.View, {
      foreignKey: 'userId',
      as: 'views'
    });
  };

  return User;
};