"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("documents", "coverImage", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("documents", "properties", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("documents", "coverImage");
    await queryInterface.removeColumn("documents", "properties");
  },
};
