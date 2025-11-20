const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Campaign = sequelize.define('Campaign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'completed'),
    defaultValue: 'draft'
  },
  maxSpinsPerUser: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  spinCooldownDays: {
    type: DataTypes.INTEGER,
    defaultValue: 7
  },
  totalBudget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  spentBudget: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  totalParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalSpins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalWins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'admins',
      key: 'id'
    }
  }
}, {
  tableName: 'campaigns',
  timestamps: true,
  indexes: [
    {
      fields: ['status', 'startDate', 'endDate']
    }
  ]
});

module.exports = Campaign;
