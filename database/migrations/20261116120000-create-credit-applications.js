'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('CreditApplications').catch(() => null);
    if (!tableInfo) {
      await queryInterface.createTable('CreditApplications', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        dealId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        accountId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        quoteId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'PENDING_REVIEW' // PENDING_REVIEW, APPROVED, DECLINED, ADVANCE_PAYMENT_REQUIRED
        },
        requestedCreditLimit: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        approvedCreditLimit: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true
        },
        requestedPaymentTerms: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: '30_DAYS' // 30_DAYS, 60_DAYS, 90_DAYS, ADVANCE
        },
        approvedPaymentTerms: {
          type: Sequelize.STRING,
          allowNull: true
        },
        tradeLicenseNumber: {
          type: Sequelize.STRING,
          allowNull: true
        },
        commercialRegistrationNumber: {
          type: Sequelize.STRING,
          allowNull: true
        },
        vatRegistrationNumber: {
          type: Sequelize.STRING,
          allowNull: true
        },
        kycDocuments: {
          type: Sequelize.TEXT, // JSON serialized array of documents
          allowNull: true
        },
        reviewedByUserId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        reviewedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        declineReason: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        fallbackToAdvancePayment: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        advancePaymentReceived: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
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

      // Performance indexes
      await queryInterface.addIndex('CreditApplications', ['dealId']).catch(() => {});
      await queryInterface.addIndex('CreditApplications', ['accountId']).catch(() => {});
      await queryInterface.addIndex('CreditApplications', ['status']).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('CreditApplications').catch(() => {});
  }
};

