'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('AssetBookings').catch(() => null);
    if (!tableInfo) {
      await queryInterface.createTable('AssetBookings', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        assetId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        dealId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        quoteId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        customerId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        bookingStatus: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'RESERVED' // RESERVED, DISPATCHED_ON_HIRE, COMPLETED, CANCELLED
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        siteLocation: {
          type: Sequelize.STRING,
          allowNull: true
        },
        assignedOperatorName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
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

      // Performance indexes for availability queries
      await queryInterface.addIndex('AssetBookings', ['assetId']).catch(() => {});
      await queryInterface.addIndex('AssetBookings', ['startDate']).catch(() => {});
      await queryInterface.addIndex('AssetBookings', ['endDate']).catch(() => {});
      await queryInterface.addIndex('AssetBookings', ['bookingStatus']).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('AssetBookings').catch(() => {});
  }
};
