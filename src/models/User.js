const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    storeOutletId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "locations",
        key: "id",
      },
    },
    consentGiven: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastSpinDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalSpins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalWins: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    registeredAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        fields: ["phoneNumber", "phoneVerified"],
      },
      {
        fields: ["storeOutletId"],
      },
      {
        fields: ["createdAt"],
      },
      {
        fields: ["deviceId"],
      },
    ],
  }
);

// User.sync({ alter: true });

module.exports = User;
