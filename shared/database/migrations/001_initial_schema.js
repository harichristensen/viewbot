'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      username: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      displayName: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      bio: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      avatarUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      isBot: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      botCreatedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create posts table
    await queryInterface.createTable('posts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      mediaType: {
        type: Sequelize.ENUM('video', 'image'),
        allowNull: false
      },
      mediaUrl: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      thumbnailUrl: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'deleted'),
        defaultValue: 'published',
        allowNull: false
      },
      viewCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      likeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      commentCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      tags: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      publishedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create likes table
    await queryInterface.createTable('likes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create views table
    await queryInterface.createTable('views', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create analytics_entries table
    await queryInterface.createTable('analytics_entries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      postId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      likeCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      commentCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      shareCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      engagementRate: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      }
    });

    // Create bot_configs table
    await queryInterface.createTable('bot_configs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      configType: {
        type: Sequelize.ENUM('posting', 'analytics', 'behavior'),
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {}
      },
      schedule: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      lastRunAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      nextRunAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Create simulation_runs table
    await queryInterface.createTable('simulation_runs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      configId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bot_configs',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      runType: {
        type: Sequelize.ENUM('posting', 'analytics', 'test'),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      results: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    // Add indexes
    await queryInterface.addIndex('users', ['username']);
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('users', ['isBot']);
    
    await queryInterface.addIndex('posts', ['userId']);
    await queryInterface.addIndex('posts', ['status']);
    await queryInterface.addIndex('posts', ['publishedAt']);
    await queryInterface.addIndex('posts', ['viewCount']);
    await queryInterface.addIndex('posts', ['likeCount']);
    
    await queryInterface.addIndex('likes', ['userId', 'postId'], { unique: true });
    await queryInterface.addIndex('likes', ['postId']);
    
    await queryInterface.addIndex('views', ['postId']);
    await queryInterface.addIndex('views', ['userId']);
    
    await queryInterface.addIndex('analytics_entries', ['postId']);
    await queryInterface.addIndex('analytics_entries', ['timestamp']);
    
    await queryInterface.addIndex('bot_configs', ['configType']);
    await queryInterface.addIndex('bot_configs', ['isActive']);
    
    await queryInterface.addIndex('simulation_runs', ['configId']);
    await queryInterface.addIndex('simulation_runs', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('simulation_runs');
    await queryInterface.dropTable('bot_configs');
    await queryInterface.dropTable('analytics_entries');
    await queryInterface.dropTable('views');
    await queryInterface.dropTable('likes');
    await queryInterface.dropTable('posts');
    await queryInterface.dropTable('users');
  }
};