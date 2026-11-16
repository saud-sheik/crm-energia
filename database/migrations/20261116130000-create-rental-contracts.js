'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('RentalContracts').catch(() => null);
    if (!tableInfo) {
      await queryInterface.createTable('RentalContracts', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        contractNumber: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        dealId: {
          type: Sequelize.UUID,
          allowNull: false
        },
        quoteId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        accountId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'DRAFT' // DRAFT, LEGAL_REVIEW, AWAITING_CLIENT_SIGNATURE, AWAITING_COMPANY_SIGNATURE, ACTIVE, TERMINATED, EXPIRED
        },
        contractStartDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        contractEndDate: {
          type: Sequelize.DATE,
          allowNull: false
        },
        totalContractValue: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        monthlyRecurringRate: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: true
        },
        securityDepositAmount: {
          type: Sequelize.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        breakdownResponseSlaHours: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 4 // Standard: 4 hours, Priority/Critical: 2 hours
        },
        backupUnitCommitment: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        insuranceResponsibility: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'CLIENT_COMPREHENSIVE'
        },
        damageLiabilityTerms: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        siteLocation: {
          type: Sequelize.STRING,
          allowNull: true
        },
        equipmentSummary: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        clientSignatoryName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        clientSignatoryTitle: {
          type: Sequelize.STRING,
          allowNull: true
        },
        clientSignedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        clientSignatureData: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        companySignatoryUserId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        companySignedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        companySignatureData: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        legalReviewedByUserId: {
          type: Sequelize.UUID,
          allowNull: true
        },
        legalReviewedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        contractPdfUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        termsAccepted: {
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
      await queryInterface.addIndex('RentalContracts', ['dealId']).catch(() => {});
      await queryInterface.addIndex('RentalContracts', ['accountId']).catch(() => {});
      await queryInterface.addIndex('RentalContracts', ['status']).catch(() => {});
      await queryInterface.addIndex('RentalContracts', ['contractNumber']).catch(() => {});
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('RentalContracts').catch(() => {});
  }
};

