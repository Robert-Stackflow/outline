"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ai_conversations", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "cascade",
      },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "cascade",
      },
      documentId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "documents", key: "id" },
        onDelete: "set null",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex("ai_conversations", ["userId"]);

    await queryInterface.createTable("ai_messages", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      conversationId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ai_conversations", key: "id" },
        onDelete: "cascade",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex("ai_messages", ["conversationId"]);

    await queryInterface.addColumn("teams", "aiSettings", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn("teams", "aiApiKey", {
      type: Sequelize.BLOB,
      allowNull: true,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("teams", "aiSettings");
    await queryInterface.removeColumn("teams", "aiApiKey");
    await queryInterface.dropTable("ai_messages");
    await queryInterface.dropTable("ai_conversations");
  },
};
