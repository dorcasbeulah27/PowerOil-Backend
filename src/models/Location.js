const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Location = sequelize.define('Location', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('supermarket', 'openmarket', 'retailstore', 'other'),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  city: {
    type: DataTypes.STRING,
    allowNull: false
  },
  state: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  radiusMeters: {
    type: DataTypes.INTEGER,
    defaultValue: 500
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  contactPerson: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  totalSpins: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  totalParticipants: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'locations',
  timestamps: true,
  indexes: [
    {
      fields: ['state', 'city', 'isActive']
    },
    {
      fields: ['latitude', 'longitude']
    }
  ]
});

module.exports = Location;
