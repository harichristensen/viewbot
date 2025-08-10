'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('posts', 'shareCount', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      after: 'commentCount' // This positions the column after commentCount
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('posts', 'shareCount');
  }
};