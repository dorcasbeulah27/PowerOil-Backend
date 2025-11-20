const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SpinResult = sequelize.define(
  "SpinResult",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    campaignId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "campaigns",
        key: "id",
      },
    },
    prizeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "prizes",
        key: "id",
      },
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "locations",
        key: "id",
      },
    },
    isWin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    redemptionCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    redemptionStatus: {
      type: DataTypes.ENUM(
        "pending",
        "redeemed",
        "expired",
        "cancelled",
        "lossprize"
      ),
      defaultValue: "pending",
    },
    redeemedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false,
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    spinDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "spin_results",
    timestamps: true,
    indexes: [
      {
        fields: ["userId", "campaignId"],
      },
      {
        fields: ["redemptionCode"],
      },
      {
        fields: ["redemptionStatus"],
      },
      {
        fields: ["spinDate"],
      },
      {
        fields: ["deviceId"],
      },
    ],
  }
);

// SpinResult.sync({ alter: true });

module.exports = SpinResult;
